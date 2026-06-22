import { el, iconEl, on, clear } from '../utils/dom';
import { icon } from './icons';
import { formatSize, formatSpeed } from '../utils/format';
import type { UploadTask } from '../webdav/types';
import type { Uploader } from '../webdav/uploader';

export interface UploadTrayHandlers {
  onClose: () => void;
  onClearCompleted: () => void;
  onAllDone: () => void;
}

export function mountUploadTray(
  uploader: Uploader,
  handlers: UploadTrayHandlers,
): { node: HTMLElement; destroy: () => void } {
  const list = el('div', { class: 'uploads__body' });

  const closeBtn = iconBtn('close', 'Fermer', () => handlers.onClose());
  const clearBtn = el(
    'button',
    {
      type: 'button',
      class: 'btn btn--ghost btn--sm',
      title: 'Effacer les terminés',
    },
    [el('span', {}, 'Effacer')],
  ) as HTMLButtonElement;
  on(clearBtn, 'click', () => handlers.onClearCompleted());

  const node = el('section', { class: 'uploads', 'aria-label': 'Transferts' }, [
    el('header', { class: 'uploads__header' }, [
      el('div', { class: 'uploads__title' }, 'Transferts'),
      el('div', { style: 'display: flex; gap: 4px;' }, [clearBtn, closeBtn]),
    ]),
    list,
  ]);

  const rowFor = new Map<string, HTMLElement>();

  const refresh = (): void => {
    const tasks = uploader.list();
    if (tasks.length === 0) {
      clear(list);
      list.appendChild(el('div', { class: 'preview__placeholder', style: 'padding: 24px;' }, 'Aucun transfert en cours.'));
      return;
    }
    // First pass: remove rows whose tasks are gone
    for (const [id, row] of rowFor) {
      if (!tasks.find((t) => t.id === id)) {
        row.remove();
        rowFor.delete(id);
      }
    }
    // Placeholder may be present
    const placeholder = list.querySelector('.preview__placeholder');
    if (placeholder) placeholder.remove();

    for (const task of tasks) {
      let row = rowFor.get(task.id);
      if (!row) {
        row = renderRow(task, uploader);
        rowFor.set(task.id, row);
        list.appendChild(row);
      } else {
        updateRow(row, task, uploader);
      }
    }
  };

  refresh();

  const unsubscribe = uploader.on((event) => {
    refresh();
    if (event.type === 'queue-empty') {
      handlers.onAllDone();
    }
  });

  return {
    node,
    destroy: () => {
      unsubscribe();
      node.remove();
    },
  };
}

function renderRow(task: UploadTask, uploader: Uploader): HTMLElement {
  const row = el('article', {
    class: `uploads__item uploads__item--${task.status}`,
    'data-id': task.id,
  });
  updateRow(row, task, uploader);
  return row;
}

function updateRow(row: HTMLElement, task: UploadTask, uploader: Uploader): void {
  row.className = `uploads__item uploads__item--${task.status}`;
  clear(row);

  const ratio = task.total > 0 ? Math.min(100, Math.round((task.loaded / task.total) * 100)) : 0;

  row.appendChild(
    el('div', { class: 'uploads__name' }, [
      iconEl(icon('file', 14)),
      el('span', { title: task.destPath }, task.file.name),
    ]),
  );
  row.appendChild(
    el('div', { class: `uploads__status uploads__status--${statusClass(task.status)}` }, statusText(task, ratio)),
  );
  row.appendChild(el('div', { class: 'uploads__progress' }, [el('span', { style: `width: ${ratio}%;` })]));
  row.appendChild(
    el('div', { class: 'uploads__item-actions' }, actionButtons(task, uploader)),
  );
}

function statusClass(status: UploadTask['status']): string {
  if (status === 'success') return 'success';
  if (status === 'error') return 'error';
  return '';
}

function statusText(task: UploadTask, ratio: number): string {
  switch (task.status) {
    case 'queued':
      return 'En attente';
    case 'uploading':
      return `${ratio}% · ${formatSize(task.loaded)} / ${formatSize(task.total)}${task.speed ? ` · ${formatSpeed(task.speed)}` : ''}`;
    case 'success':
      return `Terminé · ${formatSize(task.total)}`;
    case 'error':
      return `Erreur · ${task.error ?? 'inconnue'}`;
    case 'paused':
      return 'En pause';
    case 'cancelled':
      return 'Annulé';
  }
}

function actionButtons(task: UploadTask, uploader: Uploader): HTMLElement[] {
  const buttons: HTMLElement[] = [];
  if (task.status === 'uploading' || task.status === 'queued') {
    const b = iconBtn('cancel', 'Annuler', () => uploader.cancel(task.id));
    buttons.push(b);
  }
  if (task.status === 'error' || task.status === 'cancelled') {
    buttons.push(iconBtn('retry', 'Réessayer', () => uploader.retry(task.id)));
  }
  if (task.status === 'success' || task.status === 'error' || task.status === 'cancelled') {
    buttons.push(iconBtn('close', 'Retirer', () => uploader.remove(task.id)));
  }
  return buttons;
}

function iconBtn(name: string, label: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', {
    type: 'button',
    class: 'btn btn--ghost btn--icon btn--sm',
    'aria-label': label,
    title: label,
  }, [iconEl(icon(name as never, 14))]) as HTMLButtonElement;
  on(btn, 'click', onClick);
  return btn;
}
