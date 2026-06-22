import { el, iconEl, on } from '../utils/dom';
import { icon } from './icons';

export function renderBreadcrumb(
  path: string,
  onNavigate: (path: string) => void,
): HTMLElement {
  const parts = path.split('/').filter((p) => p.length > 0);
  const nav = el('nav', { class: 'breadcrumb', 'aria-label': 'Fil d’Ariane' });

  const root = el('button', {
    type: 'button',
    class: parts.length === 0 ? 'breadcrumb__crumb breadcrumb__crumb--current' : 'breadcrumb__crumb',
  }, [iconEl(icon('folder', 14)), el('span', {}, 'Racine')]);
  on(root, 'click', () => onNavigate(''));
  nav.appendChild(root);

  let acc = '';
  parts.forEach((part, idx) => {
    acc += (acc ? '/' : '') + part;
    nav.appendChild(el('span', { class: 'breadcrumb__sep' }, '/'));
    const isCurrent = idx === parts.length - 1;
    const crumb = el(
      'button',
      {
        type: 'button',
        class: isCurrent ? 'breadcrumb__crumb breadcrumb__crumb--current' : 'breadcrumb__crumb',
        title: acc,
      },
      [el('span', {}, part)],
    );
    if (!isCurrent) {
      const here = acc;
      on(crumb, 'click', () => onNavigate(here));
    }
    nav.appendChild(crumb);
  });

  return nav;
}
