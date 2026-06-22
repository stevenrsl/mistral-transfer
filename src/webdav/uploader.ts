/**
 * Queue-based uploader with concurrency, abort, and retry-on-transient-error.
 *
 * Earlier iterations attempted RFC 7233 Content-Range PUTs for resumable
 * chunked transfer, but partial PUT is *not* a WebDAV-standard feature —
 * each server invents its own protocol (Nextcloud's chunked v2 endpoint,
 * ownCloud's bundling, kDrive rejects with 400 entirely). Rather than
 * silently corrupt files, we stick to whole-resource PUT and rely on
 * exponential-backoff retries to recover from network blips.
 *
 * In-session resume: aborted / failed tasks can be retried. Cross-session
 * resume isn't possible without persisting the File handle, which the
 * browser's standard File API doesn't allow.
 */
import { WebDAVClient } from './client';
import { joinPath } from './path';
import { WebDAVError } from './types';
import type { UploadTask } from './types';

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
    task.loaded = 0;
    task.speed = 0;
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
      await withRetry(async () => {
        const handle = this.client.put(task.destPath, task.file, {
          signal: controller.signal,
          onProgress: (p) => {
            task.loaded = p.loaded;
            task.total = p.total;
            task.speed = p.speed;
            this.emit({ type: 'task-updated', task });
          },
        });
        await handle.promise;
      }, controller.signal);
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
