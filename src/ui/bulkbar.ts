import { el, iconEl, on } from '../utils/dom';
import { icon } from './icons';

export interface BulkbarHandlers {
  onClear: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onMove: () => void;
}

export function renderBulkbar(count: number, handlers: BulkbarHandlers): HTMLElement | null {
  if (count === 0) return null;

  const bar = el('div', { class: 'bulkbar', role: 'toolbar' });

  const left = el('div', { class: 'bulkbar__count' }, `${count} élément${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`);

  const actions = el('div', { class: 'bulkbar__actions' }, [
    button('download', 'Télécharger', () => handlers.onDownload()),
    button('edit', 'Déplacer', () => handlers.onMove()),
    button('trash', 'Supprimer', () => handlers.onDelete(), 'btn btn--danger btn--sm'),
    button('close', '', () => handlers.onClear(), 'btn btn--icon btn--sm'),
  ]);

  bar.append(left, actions);
  return bar;
}

function button(
  iconName: string,
  label: string,
  onClick: () => void,
  cls = 'btn btn--sm',
): HTMLButtonElement {
  const btn = el('button', {
    type: 'button',
    class: cls,
    'aria-label': label || undefined,
    title: label || undefined,
  }, [iconEl(icon(iconName as never, 14)), label ? el('span', {}, label) : null]) as HTMLButtonElement;
  on(btn, 'click', onClick);
  return btn;
}
