import { WebDAVClient } from './webdav/client';
import { Uploader } from './webdav/uploader';
import { joinPath, parentOf, basenameOf } from './webdav/path';
import { Store } from './state/store';
import { renderConnection } from './ui/connection';
import { renderBreadcrumb } from './ui/breadcrumb';
import { renderFileGrid } from './ui/filegrid';
import { renderBulkbar } from './ui/bulkbar';
import { renderPreview, revokePreviewUrls } from './ui/preview';
import { mountUploadTray } from './ui/uploads';
import { toast } from './ui/toast';
import { confirm, prompt } from './ui/modal';
import { icon } from './ui/icons';
import { clear, el, iconEl, on } from './utils/dom';
import type { WebDAVResource } from './webdav/types';

interface Mounted {
  node: HTMLElement;
  destroy: () => void;
}

export class App {
  private readonly root: HTMLElement;
  private readonly store = new Store();
  private uploadTray: Mounted | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.applyTheme(this.store.get().theme);
    this.store.subscribe(() => this.render());
    this.render();
    this.installShortcuts();
  }

  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private render(): void {
    const state = this.store.get();
    this.applyTheme(state.theme);

    clear(this.root);
    const app = el('div', { class: 'app' });

    app.appendChild(this.renderHeader());

    if (!state.client) {
      app.appendChild(this.renderConnectionView());
    } else {
      app.appendChild(this.renderExplorerView());
    }

    app.appendChild(
      el('footer', { class: 'app__footer' }, [
        iconEl(icon('leaf', 14)),
        el('span', {}, '100 % côté client · Vos fichiers ne quittent pas votre machine'),
      ]),
    );

    this.root.appendChild(app);
  }

  private renderHeader(): HTMLElement {
    const state = this.store.get();
    const themeBtn = el(
      'button',
      {
        type: 'button',
        class: 'btn btn--ghost btn--icon',
        title: 'Changer de thème',
        'aria-label': 'Changer de thème',
      },
      [iconEl(icon(state.theme === 'dark' ? 'sun' : 'moon', 16))],
    );
    on(themeBtn, 'click', () => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      this.store.setTheme(next);
    });

    const right = el('div', { style: 'display: flex; gap: 8px; align-items: center;' }, [themeBtn]);

    if (state.client) {
      const disconnect = el(
        'button',
        {
          type: 'button',
          class: 'btn btn--ghost btn--sm',
          title: 'Se déconnecter',
        },
        [iconEl(icon('logout', 14)), el('span', {}, 'Quitter')],
      );
      on(disconnect, 'click', () => this.disconnect());
      right.appendChild(disconnect);
    }

    return el('header', { class: 'app__header' }, [
      el('div', { class: 'brand' }, [
        el('span', { class: 'brand__mark' }, [iconEl(icon('leaf', 16))]),
        el('span', {}, 'Mistral Transfer'),
      ]),
      right,
    ]);
  }

  private renderConnectionView(): HTMLElement {
    const view = renderConnection(this.store.get().recent, {
      onSubmit: (creds) => this.connect(creds.baseUrl, creds.username, creds.password),
      onPickRecent: (conn) => {
        // Pre-fill via DOM lookup
        const view = this.root.querySelector('.connect') as HTMLElement | null;
        view?.querySelector<HTMLInputElement>('input[type="url"]')?.setAttribute('value', conn.baseUrl);
        const inputs = view?.querySelectorAll<HTMLInputElement>('input');
        if (inputs) {
          inputs[0]!.value = conn.baseUrl;
          inputs[1]!.value = conn.username;
          inputs[2]!.focus();
        }
      },
      onForgetRecent: (conn) => {
        this.store.forgetConnection(conn.baseUrl, conn.username);
        toast('Connexion oubliée', 'info');
      },
    });

    const main = el('main', { class: 'app__main' });
    main.appendChild(view);
    return main;
  }

  private renderExplorerView(): HTMLElement {
    const state = this.store.get();
    const main = el('main', {
      class: state.preview ? 'app__main app__main--with-preview' : 'app__main',
    });

    const explorer = el('div', { class: 'explorer' });

    explorer.appendChild(this.renderToolbar());

    const filesPanel = el('div', { class: 'files' });

    const bulk = renderBulkbar(state.selection.size, {
      onClear: () => this.store.clearSelection(),
      onDelete: () => this.bulkDelete(),
      onDownload: () => this.bulkDownload(),
      onMove: () => this.bulkMove(),
    });
    if (bulk) filesPanel.appendChild(bulk);

    filesPanel.appendChild(
      renderFileGrid(state, {
        onOpen: (r) => this.navigate(r.path),
        onToggle: (r, mode) =>
          this.store.toggleSelection(r.path, mode === 'multi', mode === 'range'),
        onClearSelection: () => this.store.clearSelection(),
        onSelectAll: () => this.store.selectAll(),
        onSort: (key) => this.toggleSort(key),
        onContextRename: (r) => this.renameOne(r),
        onContextDelete: (r) => this.deleteOne(r),
        onContextDownload: (r) => this.downloadOne(r),
        onContextPreview: (r) => this.store.setPreview(r),
      }),
    );

    this.installDropZone(filesPanel);

    explorer.appendChild(filesPanel);
    main.appendChild(explorer);

    if (state.preview && state.client) {
      const panel = renderPreview(state.preview, state.client, {
        onClose: () => this.store.setPreview(null),
        onDownload: (r) => this.downloadOne(r),
      });
      main.appendChild(panel);
    }

    return main;
  }

  private renderToolbar(): HTMLElement {
    const state = this.store.get();
    const refresh = el(
      'button',
      { type: 'button', class: 'btn btn--ghost btn--icon', title: 'Rafraîchir' },
      [iconEl(icon('refresh', 16))],
    );
    on(refresh, 'click', () => this.navigate(state.currentPath));

    const newFolder = el(
      'button',
      { type: 'button', class: 'btn btn--ghost', title: 'Nouveau dossier' },
      [iconEl(icon('folderPlus', 16)), el('span', {}, 'Nouveau dossier')],
    );
    on(newFolder, 'click', () => this.createFolder());

    const upload = el(
      'button',
      { type: 'button', class: 'btn btn--primary', title: 'Téléverser' },
      [iconEl(icon('upload', 16)), el('span', {}, 'Téléverser')],
    );
    on(upload, 'click', () => this.pickFiles());

    return el('div', { class: 'explorer__toolbar' }, [
      renderBreadcrumb(state.currentPath, (path) => this.navigate(path)),
      el('div', { class: 'explorer__actions' }, [refresh, newFolder, upload]),
    ]);
  }

  // -- Actions ----------------------------------------------------------

  private async connect(baseUrl: string, username: string, password: string): Promise<void> {
    try {
      const client = new WebDAVClient({ baseUrl, username, password });
      await client.list('');
      const uploader = new Uploader(client);
      this.store.setClient(client, uploader);
      this.store.rememberConnection(baseUrl, username);
      toast(`Connecté à ${safeHost(baseUrl)}`, 'success');
      await this.navigate('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast(`Connexion impossible : ${message}`, 'error', 6000);
    }
  }

  private disconnect(): void {
    this.uploadTray?.destroy();
    this.uploadTray = null;
    this.store.setClient(null, null);
    toast('Déconnecté', 'info');
  }

  private async navigate(path: string): Promise<void> {
    const { client } = this.store.get();
    if (!client) return;
    this.store.setLoading(true);
    try {
      const files = await client.list(path);
      this.store.setFiles(path, files);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.store.setError(message);
      this.store.setLoading(false);
    }
  }

  private toggleSort(key: 'name' | 'size' | 'modified' | 'kind'): void {
    const { sort } = this.store.get();
    if (sort.key === key) {
      this.store.setSort({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      this.store.setSort({ key, dir: 'asc' });
    }
  }

  private async createFolder(): Promise<void> {
    const name = await prompt({
      title: 'Nouveau dossier',
      placeholder: 'Nom du dossier',
      confirmLabel: 'Créer',
      validate: (v) => (v.length === 0 ? 'Le nom est requis.' : v.includes('/') ? 'Pas de « / » dans le nom.' : null),
    });
    if (!name) return;
    const { client, currentPath } = this.store.get();
    if (!client) return;
    try {
      await client.mkcol(joinPath(currentPath, name));
      toast(`Dossier « ${name} » créé`, 'success');
      this.navigate(currentPath);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, 'error');
    }
  }

  private async renameOne(resource: WebDAVResource): Promise<void> {
    const name = await prompt({
      title: 'Renommer',
      placeholder: 'Nouveau nom',
      initial: resource.name,
      confirmLabel: 'Renommer',
      validate: (v) => (v.length === 0 ? 'Le nom est requis.' : v.includes('/') ? 'Pas de « / » dans le nom.' : null),
    });
    if (!name || name === resource.name) return;
    const { client, currentPath } = this.store.get();
    if (!client) return;
    const dest = joinPath(parentOf(resource.path), name);
    try {
      await client.move(resource.path, dest);
      toast('Renommé', 'success');
      this.navigate(currentPath);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, 'error');
    }
  }

  private async deleteOne(resource: WebDAVResource): Promise<void> {
    const ok = await confirm({
      title: `Supprimer « ${resource.name} » ?`,
      body:
        resource.kind === 'directory'
          ? 'Le dossier et tout son contenu seront supprimés. Cette action est irréversible.'
          : 'Le fichier sera supprimé. Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    const { client, currentPath } = this.store.get();
    if (!client) return;
    try {
      await client.delete(resource.path);
      toast('Supprimé', 'success');
      this.navigate(currentPath);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, 'error');
    }
  }

  private async downloadOne(resource: WebDAVResource): Promise<void> {
    const { client } = this.store.get();
    if (!client) return;
    try {
      const blob = await client.download(resource.path);
      saveBlob(blob, resource.name);
    } catch (err) {
      toast(`Téléchargement impossible : ${(err as Error).message}`, 'error');
    }
  }

  private async bulkDelete(): Promise<void> {
    const { client, currentPath, files, selection } = this.store.get();
    if (!client) return;
    const targets = files.filter((f) => selection.has(f.path));
    if (targets.length === 0) return;
    const ok = await confirm({
      title: `Supprimer ${targets.length} élément${targets.length > 1 ? 's' : ''} ?`,
      body: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    const results = await Promise.allSettled(targets.map((t) => client.delete(t.path)));
    const failures = results.filter((r) => r.status === 'rejected').length;
    if (failures === 0) toast(`${targets.length} élément(s) supprimé(s)`, 'success');
    else toast(`${failures} échec(s) sur ${targets.length}`, 'error');
    this.navigate(currentPath);
  }

  private async bulkDownload(): Promise<void> {
    const { client, files, selection } = this.store.get();
    if (!client) return;
    const targets = files.filter((f) => selection.has(f.path) && f.kind === 'file');
    if (targets.length === 0) {
      toast('Les dossiers ne peuvent pas être téléchargés en lot.', 'info');
      return;
    }
    for (const t of targets) {
      try {
        const blob = await client.download(t.path);
        saveBlob(blob, t.name);
      } catch (err) {
        toast(`Échec « ${t.name} » : ${(err as Error).message}`, 'error');
      }
    }
  }

  private async bulkMove(): Promise<void> {
    const { client, currentPath, files, selection } = this.store.get();
    if (!client) return;
    const targets = files.filter((f) => selection.has(f.path));
    if (targets.length === 0) return;
    const dest = await prompt({
      title: `Déplacer ${targets.length} élément${targets.length > 1 ? 's' : ''}`,
      body: 'Chemin de destination, relatif à la racine WebDAV.',
      placeholder: 'documents/archives',
      initial: parentOf(targets[0]!.path),
      confirmLabel: 'Déplacer',
    });
    if (dest === null) return;
    const cleanDest = dest.replace(/^\/+|\/+$/g, '');
    const results = await Promise.allSettled(
      targets.map((t) => client.move(t.path, joinPath(cleanDest, basenameOf(t.path)))),
    );
    const failures = results.filter((r) => r.status === 'rejected').length;
    if (failures === 0) toast(`${targets.length} élément(s) déplacé(s)`, 'success');
    else toast(`${failures} échec(s) sur ${targets.length}`, 'error');
    this.navigate(currentPath);
  }

  private pickFiles(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.addEventListener('change', () => {
      const files = input.files ? Array.from(input.files) : [];
      this.enqueueFiles(files);
    });
    input.click();
  }

  private enqueueFiles(files: File[]): void {
    const { uploader, currentPath } = this.store.get();
    if (!uploader || files.length === 0) return;
    for (const file of files) {
      uploader.enqueue(file, currentPath);
    }
    this.ensureUploadTray();
    toast(`${files.length} fichier(s) ajouté(s) à la file`, 'info');
  }

  private ensureUploadTray(): void {
    if (this.uploadTray) return;
    const { uploader } = this.store.get();
    if (!uploader) return;
    this.uploadTray = mountUploadTray(uploader, {
      onClose: () => {
        this.uploadTray?.destroy();
        this.uploadTray = null;
      },
      onClearCompleted: () => uploader.clearCompleted(),
      onAllDone: () => {
        const { currentPath } = this.store.get();
        this.navigate(currentPath);
      },
    });
    document.body.appendChild(this.uploadTray.node);
  }

  private installDropZone(panel: HTMLElement): void {
    let depth = 0;
    on(panel, 'dragenter', (ev) => {
      ev.preventDefault();
      depth++;
      panel.classList.add('files--drop-target');
    });
    on(panel, 'dragover', (ev) => {
      ev.preventDefault();
      (ev as DragEvent).dataTransfer!.dropEffect = 'copy';
    });
    on(panel, 'dragleave', (ev) => {
      ev.preventDefault();
      depth--;
      if (depth <= 0) {
        depth = 0;
        panel.classList.remove('files--drop-target');
      }
    });
    on(panel, 'drop', (ev) => {
      ev.preventDefault();
      depth = 0;
      panel.classList.remove('files--drop-target');
      const items = (ev as DragEvent).dataTransfer?.files;
      if (!items || items.length === 0) return;
      this.enqueueFiles(Array.from(items));
    });
  }

  private installShortcuts(): void {
    on(document, 'keydown', (ev) => {
      const keyEv = ev as KeyboardEvent;
      const target = keyEv.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]')) return;
      if ((keyEv.metaKey || keyEv.ctrlKey) && keyEv.key.toLowerCase() === 'a') {
        const { client, files } = this.store.get();
        if (client && files.length > 0) {
          keyEv.preventDefault();
          this.store.selectAll();
        }
      } else if (keyEv.key === 'Escape') {
        const { selection, preview } = this.store.get();
        if (preview) {
          this.store.setPreview(null);
        } else if (selection.size > 0) {
          this.store.clearSelection();
        }
      } else if (keyEv.key === 'Delete' || keyEv.key === 'Backspace') {
        const { selection, files } = this.store.get();
        if (selection.size > 0) {
          if (selection.size === 1) {
            const path = [...selection][0]!;
            const target = files.find((f) => f.path === path);
            if (target) this.deleteOne(target);
          } else {
            this.bulkDelete();
          }
        }
      }
    });
  }

  private cleanup(): void {
    // currently the preview node is recreated on every render, so just revoke
    // any blob URLs that may be attached.
    revokePreviewUrls(this.root.querySelector('.preview') as HTMLElement | null);
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 100);
}
