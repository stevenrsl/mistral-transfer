/**
 * Queue-based uploader with progress, retry, and chunked transfer for big files.
 *
 * Chunked uploads use standard `Content-Range` on PUT — supported by Apache
 * mod_dav and most well-behaved WebDAV implementations. Servers that reject
 * it (some Nextcloud configurations) cause us to fall back to a single PUT.
 */
import { WebDAVClient } from './client';
import { joinPath } from './path';
import { WebDAVError } from './types';
import type { UploadTask } from './types';

const CHUNK_THRESHOLD = 100 * 1024 * 1024; // 100 MiB
const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 800;

export type UploaderEvent =
  | { type: 'task-added'; task: UploadTask }
  | { type: 'task-updated'; task: UploadTask }
  | { type: 'task-removed'; id: string }
  | { type: 'queue-empty' };

type Listener = (event: UploaderEvent) => void;

export class Uploader {
  private readonly tasks = new Map<string, UploadTask>();
  private readonly listeners = new Set<Listener>();
  private readonly aborts = new Map<string, AbortController>();
  private active = 0;
  private readonly concurrency: number;

  constructor(
    private client: WebDAVClient,
    options: { concurrency?: number } = {},
  ) {
    this.concurrency = options.concurrency ?? 2;
  }

  setClient(client: WebDAVClient): void {
    this.client = client;
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  list(): UploadTask[] {
    return [...this.tasks.values()];
  }

  enqueue(file: File, destDir: string): UploadTask {
    const id = crypto.randomUUID();
    const task: UploadTask = {
      id,
      file,
      destPath: joinPath(destDir, file.name),
      status: 'queued',
      loaded: 0,
      total: file.size,
      speed: 0,
      error: null,
      startedAt: null,
      resumeOffset: 0,
    };
    this.tasks.set(id, task);
    this.emit({ type: 'task-added', task });
    this.pump();
    return task;
  }

  cancel(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    this.aborts.get(id)?.abort();
    if (task.status === 'queued' || task.status === 'paused') {
      task.status = 'cancelled';
      this.emit({ type: 'task-updated', task });
    }
  }

  retry(id: string): void {
    const task = this.tasks.get(id);
    if (!task || (task.status !== 'error' && task.status !== 'cancelled')) return;
    task.status = 'queued';
    task.error = null;
    this.emit({ type: 'task-updated', task });
    this.pump();
  }

  remove(id: string): void {
    this.cancel(id);
    this.tasks.delete(id);
    this.emit({ type: 'task-removed', id });
  }

  clearCompleted(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === 'success' || task.status === 'cancelled') {
        this.tasks.delete(id);
        this.emit({ type: 'task-removed', id });
      }
    }
  }

  private emit(event: UploaderEvent): void {
    for (const l of this.listeners) l(event);
  }

  private pump(): void {
    while (this.active < this.concurrency) {
      const next = [...this.tasks.values()].find((t) => t.status === 'queued');
      if (!next) {
        if (this.active === 0) this.emit({ type: 'queue-empty' });
        return;
      }
      void this.run(next);
    }
  }

  private async run(task: UploadTask): Promise<void> {
    this.active++;
    task.status = 'uploading';
    task.startedAt = Date.now();
    this.emit({ type: 'task-updated', task });

    const controller = new AbortController();
    this.aborts.set(task.id, controller);

    try {
      if (task.file.size >= CHUNK_THRESHOLD) {
        await this.runChunked(task, controller.signal);
      } else {
        await this.runSingle(task, controller.signal);
      }
      task.status = 'success';
      task.loaded = task.total;
      this.emit({ type: 'task-updated', task });
    } catch (err) {
      if (controller.signal.aborted) {
        task.status = 'cancelled';
      } else {
        task.status = 'error';
        task.error = err instanceof Error ? err.message : String(err);
      }
      this.emit({ type: 'task-updated', task });
    } finally {
      this.aborts.delete(task.id);
      this.active--;
      this.pump();
    }
  }

  private async runSingle(task: UploadTask, signal: AbortSignal): Promise<void> {
    await withRetry(async () => {
      const handle = this.client.put(task.destPath, task.file, {
        signal,
        onProgress: (p) => {
          task.loaded = p.loaded;
          task.total = p.total;
          task.speed = p.speed;
          this.emit({ type: 'task-updated', task });
        },
      });
      await handle.promise;
    }, signal);
  }

  private async runChunked(task: UploadTask, signal: AbortSignal): Promise<void> {
    let offset = task.resumeOffset;
    const total = task.file.size;
    let chunkedSupported = true;

    while (offset < total) {
      if (signal.aborted) throw new WebDAVError('Aborted', 0, 'PUT', task.destPath);
      const end = Math.min(offset + CHUNK_SIZE, total);
      const chunk = task.file.slice(offset, end);

      const baseLoaded = offset;
      try {
        await withRetry(async () => {
          const handle = this.client.put(task.destPath, chunk, {
            signal,
            contentRange: { start: offset, end: end - 1, total },
            onProgress: (p) => {
              task.loaded = baseLoaded + p.loaded;
              task.speed = p.speed;
              this.emit({ type: 'task-updated', task });
            },
          });
          await handle.promise;
        }, signal);
      } catch (err) {
        if (
          err instanceof WebDAVError &&
          (err.status === 501 || err.status === 405)
        ) {
          chunkedSupported = false;
        }
        if (!chunkedSupported) {
          task.resumeOffset = 0;
          task.loaded = 0;
          this.emit({ type: 'task-updated', task });
          await this.runSingle(task, signal);
          return;
        }
        throw err;
      }

      offset = end;
      task.resumeOffset = offset;
      this.emit({ type: 'task-updated', task });
    }
  }
}

async function withRetry(
  op: () => Promise<void>,
  signal: AbortSignal,
  attempts = MAX_RETRIES,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal.aborted) throw new Error('Aborted');
    try {
      await op();
      return;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      const delay = RETRY_BASE_MS * 2 ** attempt + Math.random() * 200;
      await sleep(delay, signal);
    }
  }
  throw lastErr;
}

function isTransient(err: unknown): boolean {
  if (!(err instanceof WebDAVError)) return false;
  if (err.status === 0) return true; // network blip
  return err.status === 408 || err.status === 429 || (err.status >= 500 && err.status < 600);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new Error('Aborted'));
      },
      { once: true },
    );
  });
}
