import { el, iconEl, clear } from '../utils/dom';
import { icon } from './icons';

type Variant = 'success' | 'error' | 'info';

let stack: HTMLElement | null = null;

function getStack(): HTMLElement {
  if (stack) return stack;
  stack = el('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(stack);
  return stack;
}

const VARIANT_ICON: Record<Variant, string> = {
  success: 'check',
  error: 'alert',
  info: 'info',
};

export function toast(message: string, variant: Variant = 'success', timeoutMs = 3800): void {
  const node = el('div', { class: `toast toast--${variant}`, role: 'alert' }, [
    iconEl(icon(VARIANT_ICON[variant] as never, 18)),
    el('span', {}, message),
  ]);
  getStack().appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .2s';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 220);
  }, timeoutMs);
}

export function clearToasts(): void {
  if (stack) clear(stack);
}
