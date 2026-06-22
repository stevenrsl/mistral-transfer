import type { WebDAVClient } from '../webdav/client';
import type { WebDAVResource } from '../webdav/types';
import type { Uploader } from '../webdav/uploader';
import type { SavedConnection, Theme } from './persistence';
import { readJSON, readString, writeJSON, writeString } from './persistence';

export interface AppState {
  theme: Theme;
  client: WebDAVClient | null;
  uploader: Uploader | null;
  currentPath: string;
  files: WebDAVResource[];
  loading: boolean;
  error: string | null;
  selection: Set<string>; // path -> selected
  preview: WebDAVResource | null;
  recent: SavedConnection[];
  sort: { key: 'name' | 'size' | 'modified' | 'kind'; dir: 'asc' | 'desc' };
}

type Listener = (state: AppState) => void;

const MAX_RECENT = 6;

function loadRecent(): SavedConnection[] {
  return readJSON<SavedConnection[]>('recent', []);
}

function loadTheme(): Theme {
  const raw = readString('theme');
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export class Store {
  private state: AppState;
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.state = {
      theme: loadTheme(),
      client: null,
      uploader: null,
      currentPath: '',
      files: [],
      loading: false,
      error: null,
      selection: new Set(),
      preview: null,
      recent: loadRecent(),
      sort: { key: 'name', dir: 'asc' },
    };
  }

  get(): Readonly<AppState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  setTheme(theme: Theme): void {
    writeString('theme', theme);
    this.commit({ theme });
  }

  setClient(client: WebDAVClient | null, uploader: Uploader | null): void {
    this.commit({
      client,
      uploader,
      currentPath: '',
      files: [],
      selection: new Set(),
      preview: null,
      error: null,
    });
  }

  setLoading(loading: boolean): void {
    this.commit({ loading });
  }

  setError(error: string | null): void {
    this.commit({ error });
  }

  setFiles(currentPath: string, files: WebDAVResource[]): void {
    this.commit({
      currentPath,
      files,
      selection: new Set(),
      preview: null,
      loading: false,
      error: null,
    });
  }

  setSort(sort: AppState['sort']): void {
    this.commit({ sort });
  }

  toggleSelection(path: string, multi: boolean, range?: boolean): void {
    const sel = new Set(this.state.selection);
    if (range && sel.size > 0) {
      const paths = this.state.files.map((f) => f.path);
      const lastSel = [...sel].pop()!;
      const fromIdx = paths.indexOf(lastSel);
      const toIdx = paths.indexOf(path);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        for (let i = lo; i <= hi; i++) {
          const p = paths[i];
          if (p) sel.add(p);
        }
      }
    } else if (multi) {
      if (sel.has(path)) sel.delete(path);
      else sel.add(path);
    } else {
      sel.clear();
      sel.add(path);
    }
    this.commit({ selection: sel });
  }

  clearSelection(): void {
    if (this.state.selection.size === 0) return;
    this.commit({ selection: new Set() });
  }

  selectAll(): void {
    this.commit({ selection: new Set(this.state.files.map((f) => f.path)) });
  }

  setPreview(preview: WebDAVResource | null): void {
    this.commit({ preview });
  }

  rememberConnection(baseUrl: string, username: string): void {
    const recent = this.state.recent.filter(
      (c) => !(c.baseUrl === baseUrl && c.username === username),
    );
    recent.unshift({ baseUrl, username, lastUsedAt: Date.now() });
    while (recent.length > MAX_RECENT) recent.pop();
    writeJSON('recent', recent);
    this.commit({ recent });
  }

  forgetConnection(baseUrl: string, username: string): void {
    const recent = this.state.recent.filter(
      (c) => !(c.baseUrl === baseUrl && c.username === username),
    );
    writeJSON('recent', recent);
    this.commit({ recent });
  }
}
