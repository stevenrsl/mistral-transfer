import { el, on } from '../utils/dom';

interface PromptOptions {
  title: string;
  body?: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
}

interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

function mount(card: HTMLElement, onClose: () => void): () => void {
  const root = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [card]);
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  const close = (): void => {
    document.body.style.overflow = '';
    root.remove();
  };

  const offKey = on(document, 'keydown', (ev) => {
    if (ev.key === 'Escape') {
      onClose();
      offKey();
      close();
    }
  });

  on(root, 'click', (ev) => {
    if (ev.target === root) {
      onClose();
      offKey();
      close();
    }
  });

  return () => {
    offKey();
    close();
  };
}

export function prompt(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const input = el('input', {
      class: 'input',
      type: 'text',
      placeholder: opts.placeholder ?? '',
      value: opts.initial ?? '',
    }) as HTMLInputElement;
    input.style.width = '100%';
    input.style.padding = '0 12px';
    input.style.height = '40px';
    input.style.border = '1px solid var(--border-default)';
    input.style.borderRadius = 'var(--radius-md)';
    input.style.background = 'var(--surface-base)';

    const error = el('p', { class: 'modal__body', style: 'color: var(--danger-500); margin-top: 8px; display: none;' });

    const cancelBtn = el('button', { class: 'btn', type: 'button' }, opts.cancelLabel ?? 'Annuler');
    const confirmBtn = el('button', { class: 'btn btn--primary', type: 'button' }, opts.confirmLabel ?? 'OK');

    const card = el('div', { class: 'modal__card' }, [
      el('h2', { class: 'modal__title' }, opts.title),
      opts.body ? el('p', { class: 'modal__body' }, opts.body) : null,
      input,
      error,
      el('div', { class: 'modal__actions', style: 'margin-top: 20px;' }, [cancelBtn, confirmBtn]),
    ]);

    const submit = (): void => {
      const value = input.value.trim();
      if (opts.validate) {
        const msg = opts.validate(value);
        if (msg) {
          error.textContent = msg;
          error.style.display = 'block';
          return;
        }
      }
      close();
      resolve(value);
    };

    const close = mount(card, () => resolve(null));

    on(cancelBtn, 'click', () => {
      close();
      resolve(null);
    });
    on(confirmBtn, 'click', submit);
    on(input, 'keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter') submit();
    });

    setTimeout(() => input.focus(), 50);
  });
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const cancelBtn = el('button', { class: 'btn', type: 'button' }, opts.cancelLabel ?? 'Annuler');
    const confirmBtn = el(
      'button',
      { class: `btn ${opts.danger ? 'btn--danger' : 'btn--primary'}`, type: 'button' },
      opts.confirmLabel ?? 'Confirmer',
    );

    const card = el('div', { class: 'modal__card' }, [
      el('h2', { class: 'modal__title' }, opts.title),
      el('p', { class: 'modal__body' }, opts.body),
      el('div', { class: 'modal__actions' }, [cancelBtn, confirmBtn]),
    ]);

    const close = mount(card, () => resolve(false));
    on(cancelBtn, 'click', () => {
      close();
      resolve(false);
    });
    on(confirmBtn, 'click', () => {
      close();
      resolve(true);
    });
    setTimeout(() => confirmBtn.focus(), 50);
  });
}
