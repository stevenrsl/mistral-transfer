import { el, iconEl, on } from '../utils/dom';
import { icon } from './icons';
import type { SavedConnection } from '../state/persistence';

export interface ConnectionSubmit {
  baseUrl: string;
  username: string;
  password: string;
}

export interface ConnectionViewHandlers {
  onSubmit: (creds: ConnectionSubmit) => Promise<void> | void;
  onPickRecent: (conn: SavedConnection) => void;
  onForgetRecent: (conn: SavedConnection) => void;
}

export function renderConnection(
  recent: SavedConnection[],
  handlers: ConnectionViewHandlers,
): HTMLElement {
  const urlInput = el('input', {
    type: 'url',
    name: 'url',
    placeholder: 'https://exemple.com/remote.php/dav/files/alice/',
    required: 'required',
    autocomplete: 'url',
  }) as HTMLInputElement;
  const userInput = el('input', {
    type: 'text',
    name: 'username',
    placeholder: 'alice',
    required: 'required',
    autocomplete: 'username',
  }) as HTMLInputElement;
  const passInput = el('input', {
    type: 'password',
    name: 'password',
    placeholder: '••••••••',
    required: 'required',
    autocomplete: 'current-password',
  }) as HTMLInputElement;

  const toggleBtn = el('button', {
    type: 'button',
    class: 'input__action',
    'aria-label': 'Afficher le mot de passe',
  }, [iconEl(icon('eye', 16))]) as HTMLButtonElement;

  on(toggleBtn, 'click', () => {
    const showing = passInput.type === 'text';
    passInput.type = showing ? 'password' : 'text';
    toggleBtn.replaceChildren(iconEl(icon(showing ? 'eye' : 'eyeOff', 16)));
  });

  const submitBtn = el(
    'button',
    { type: 'submit', class: 'btn btn--primary', style: 'width: 100%; height: 44px;' },
    [iconEl(icon('link', 16)), el('span', {}, 'Se connecter')],
  ) as HTMLButtonElement;

  const form = el('form', { class: 'connect__form' }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'url' }, 'URL du serveur'),
      el('div', { class: 'input' }, [
        iconEl(icon('server', 16)),
        urlInput,
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label' }, 'Utilisateur'),
      el('div', { class: 'input' }, [
        iconEl(icon('user', 16)),
        userInput,
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label' }, 'Mot de passe'),
      el('div', { class: 'input' }, [
        iconEl(icon('lock', 16)),
        passInput,
        toggleBtn,
      ]),
    ]),
    submitBtn,
  ]);

  on(form, 'submit', async (ev) => {
    ev.preventDefault();
    const baseUrl = urlInput.value.trim();
    const username = userInput.value.trim();
    const password = passInput.value;
    if (!baseUrl || !username || !password) return;
    submitBtn.disabled = true;
    submitBtn.replaceChildren(
      el('span', { class: 'spinner', style: 'width: 16px; height: 16px; border-width: 2px;' }),
      el('span', {}, 'Connexion…'),
    );
    try {
      await handlers.onSubmit({ baseUrl, username, password });
    } finally {
      submitBtn.disabled = false;
      submitBtn.replaceChildren(iconEl(icon('link', 16)), el('span', {}, 'Se connecter'));
    }
  });

  const hint = el('div', { class: 'connect__hint' }, [
    iconEl(icon('info', 14)),
    el('span', {}, [
      "Pour Nextcloud / ownCloud : ",
      el('code', {}, '/remote.php/dav/files/VOTRE_USER/'),
      ". La connexion est directe — pensez à autoriser CORS côté serveur si nécessaire.",
    ]),
  ]);

  const card = el('div', { class: 'connect__card' }, [
    el('h1', { class: 'connect__title' }, 'Connexion WebDAV'),
    el('p', { class: 'connect__lead' }, 'Tout reste dans votre navigateur. Aucun fichier ne passe par un serveur tiers.'),
    form,
    hint,
    recent.length > 0 ? renderRecent(recent, handlers) : null,
  ]);

  return el('div', { class: 'connect' }, [card]);
}

function renderRecent(recent: SavedConnection[], handlers: ConnectionViewHandlers): HTMLElement {
  const list = el('div', { class: 'recent-list' });
  for (const conn of recent) {
    const host = safeHost(conn.baseUrl);
    const item = el('div', { class: 'recent-item' }, [
      iconEl(icon('server', 16)),
      el('div', { class: 'recent-item__main' }, [
        el('strong', {}, `${conn.username} @ ${host}`),
        el('span', {}, conn.baseUrl),
      ]),
      el('button', {
        type: 'button',
        class: 'recent-item__remove',
        'aria-label': 'Oublier',
        title: 'Oublier cette connexion',
      }, [iconEl(icon('trash', 14))]),
    ]);
    on(item, 'click', (ev) => {
      if ((ev.target as HTMLElement).closest('.recent-item__remove')) return;
      handlers.onPickRecent(conn);
    });
    on(item.querySelector('.recent-item__remove') as HTMLButtonElement, 'click', (ev) => {
      ev.stopPropagation();
      handlers.onForgetRecent(conn);
    });
    list.appendChild(item);
  }
  return el('div', { class: 'connect__recent' }, [
    el('h3', {}, 'Connexions récentes'),
    list,
  ]);
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
