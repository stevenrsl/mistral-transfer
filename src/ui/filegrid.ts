import { el, iconEl, on } from '../utils/dom';
import { icon } from './icons';
import { categoryFor } from '../utils/mime';
import { formatDate, formatSize } from '../utils/format';
import type { WebDAVResource } from '../webdav/types';
import type { AppState } from '../state/store';

const CATEGORY_ICON: Record<string, keyof typeof iconNames> = {
  image: 'fileImage',
  video: 'fileVideo',
  audio: 'fileAudio',
  text: 'fileText',
  markdown: 'fileText',
  code: 'fileCode',
  pdf: 'filePdf',
  archive: 'fileArchive',
  binary: 'file',
};

// just a phantom type-helper
const iconNames = {
  fileImage: true,
  fileVideo: true,
  fileAudio: true,
  fileText: true,
  fileCode: true,
  filePdf: true,
  fileArchive: true,
  file: true,
  folder: true,
} as const;

function resourceIcon(r: WebDAVResource): string {
  if (r.kind === 'directory') return icon('folder', 18);
  const cat = categoryFor(r.name, r.contentType);
  return icon(CATEGORY_ICON[cat] ?? 'file', 18);
}

export interface FileGridHandlers {
  onOpen: (resource: WebDAVResource) => void;
  onToggle: (resource: WebDAVResource, mode: 'single' | 'multi' | 'range') => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onSort: (key: 'name' | 'size' | 'modified' | 'kind') => void;
  onContextRename: (resource: WebDAVResource) => void;
  onContextDelete: (resource: WebDAVResource) => void;
  onContextDownload: (resource: WebDAVResource) => void;
  onContextPreview: (resource: WebDAVResource) => void;
}

export function renderFileGrid(state: AppState, handlers: FileGridHandlers): HTMLElement {
  if (state.loading) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'spinner' }),
      el('p', {}, 'Chargement…'),
    ]);
  }

  if (state.error) {
    return el('div', { class: 'empty' }, [
      iconEl(icon('alert', 48)),
      el('h3', {}, 'Impossible de charger ce dossier'),
      el('p', {}, state.error),
    ]);
  }

  if (state.files.length === 0) {
    return el('div', { class: 'empty' }, [
      iconEl(icon('folder', 48)),
      el('h3', {}, 'Dossier vide'),
      el('p', {}, 'Glissez-déposez des fichiers ici pour les téléverser.'),
    ]);
  }

  const sorted = sortFiles(state.files, state.sort);

  const sortHeader = (
    label: string,
    key: 'name' | 'size' | 'modified' | 'kind',
  ): HTMLElement => {
    const isActive = state.sort.key === key;
    const arrow = isActive ? icon(state.sort.dir === 'asc' ? 'caretUp' : 'caretDown', 12) : '';
    const btn = el('button', { type: 'button' }, [
      el('span', {}, label),
      isActive ? iconEl(arrow) : null,
    ]);
    on(btn, 'click', () => handlers.onSort(key));
    return btn;
  };

  const list = el('div', { class: 'files__list', role: 'listbox', 'aria-multiselectable': 'true' });

  list.appendChild(
    el('div', { class: 'files__head', role: 'row' }, [
      el('span'),
      sortHeader('Nom', 'name'),
      sortHeader('Taille', 'size'),
      sortHeader('Modifié', 'modified'),
      el('span'),
    ]),
  );

  for (const file of sorted) {
    const selected = state.selection.has(file.path);
    const row = el(
      'div',
      {
        class: 'files__row',
        role: 'option',
        'aria-selected': selected ? 'true' : 'false',
        'data-kind': file.kind,
        'data-path': file.path,
        tabindex: '0',
      },
      [
        el('div', { class: 'files__checkbox' }, [iconEl(icon('check', 12))]),
        el('div', { class: 'files__name' }, [
          iconEl(resourceIcon(file)),
          el('span', {}, file.name),
        ]),
        el('div', { class: 'files__meta' }, file.kind === 'directory' ? '—' : formatSize(file.size)),
        el('div', { class: 'files__meta' }, formatDate(file.lastModified)),
        rowActions(file, handlers),
      ],
    );

    on(row, 'click', (ev) => {
      const target = ev.target as HTMLElement;
      if (target.closest('.files__actions')) return;
      if (target.closest('.files__checkbox')) {
        handlers.onToggle(file, 'multi');
        return;
      }
      const mouseEv = ev as MouseEvent;
      if (mouseEv.shiftKey) {
        handlers.onToggle(file, 'range');
      } else if (mouseEv.metaKey || mouseEv.ctrlKey) {
        handlers.onToggle(file, 'multi');
      } else if (file.kind === 'directory') {
        handlers.onOpen(file);
      } else {
        handlers.onContextPreview(file);
      }
    });

    on(row, 'dblclick', () => {
      if (file.kind === 'directory') handlers.onOpen(file);
      else handlers.onContextDownload(file);
    });

    on(row, 'keydown', (ev) => {
      const keyEv = ev as KeyboardEvent;
      if (keyEv.key === 'Enter') {
        if (file.kind === 'directory') handlers.onOpen(file);
        else handlers.onContextPreview(file);
      } else if (keyEv.key === ' ') {
        keyEv.preventDefault();
        handlers.onToggle(file, 'multi');
      }
    });

    list.appendChild(row);
  }

  return list;
}

function rowActions(file: WebDAVResource, handlers: FileGridHandlers): HTMLElement {
  const actions = el('div', { class: 'files__actions' });
  if (file.kind === 'file') {
    const previewBtn = iconBtn('eye', 'Aperçu');
    on(previewBtn, 'click', (ev) => {
      ev.stopPropagation();
      handlers.onContextPreview(file);
    });
    actions.appendChild(previewBtn);
    const dlBtn = iconBtn('download', 'Télécharger');
    on(dlBtn, 'click', (ev) => {
      ev.stopPropagation();
      handlers.onContextDownload(file);
    });
    actions.appendChild(dlBtn);
  }
  const renameBtn = iconBtn('edit', 'Renommer');
  on(renameBtn, 'click', (ev) => {
    ev.stopPropagation();
    handlers.onContextRename(file);
  });
  actions.appendChild(renameBtn);
  const delBtn = iconBtn('trash', 'Supprimer');
  on(delBtn, 'click', (ev) => {
    ev.stopPropagation();
    handlers.onContextDelete(file);
  });
  actions.appendChild(delBtn);
  return actions;
}

function iconBtn(name: keyof typeof iconNames | string, label: string): HTMLButtonElement {
  const btn = el('button', {
    type: 'button',
    class: 'btn btn--ghost btn--icon btn--sm',
    'aria-label': label,
    title: label,
  }, [iconEl(icon(name as never, 14))]) as HTMLButtonElement;
  return btn;
}

function sortFiles(files: WebDAVResource[], sort: AppState['sort']): WebDAVResource[] {
  const dirs = files.filter((f) => f.kind === 'directory');
  const docs = files.filter((f) => f.kind === 'file');
  const cmp = comparator(sort);
  dirs.sort(cmp);
  docs.sort(cmp);
  if (sort.key === 'kind') {
    return sort.dir === 'asc' ? [...dirs, ...docs] : [...docs, ...dirs];
  }
  return [...dirs, ...docs];
}

function comparator(sort: AppState['sort']): (a: WebDAVResource, b: WebDAVResource) => number {
  const sign = sort.dir === 'asc' ? 1 : -1;
  switch (sort.key) {
    case 'size':
      return (a, b) => sign * (a.size - b.size);
    case 'modified':
      return (a, b) => {
        const ta = a.lastModified?.getTime() ?? 0;
        const tb = b.lastModified?.getTime() ?? 0;
        return sign * (ta - tb);
      };
    case 'name':
    case 'kind':
    default:
      return (a, b) => sign * a.name.localeCompare(b.name, 'fr', { numeric: true });
  }
}
