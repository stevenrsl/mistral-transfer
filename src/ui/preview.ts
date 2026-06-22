import { el, iconEl, on, clear } from '../utils/dom';
import { icon } from './icons';
import { formatDate, formatSize } from '../utils/format';
import { categoryFor, type FileCategory } from '../utils/mime';
import { renderMarkdown } from './markdown';
import type { WebDAVClient } from '../webdav/client';
import type { WebDAVResource } from '../webdav/types';

const MAX_PREVIEW_BYTES = 25 * 1024 * 1024; // 25 MiB
const MAX_TEXT_BYTES = 512 * 1024; // 512 KiB

export interface PreviewHandlers {
  onClose: () => void;
  onDownload: (resource: WebDAVResource) => void;
}

const objectUrls = new WeakMap<HTMLElement, string>();

export function renderPreview(
  resource: WebDAVResource,
  client: WebDAVClient,
  handlers: PreviewHandlers,
): HTMLElement {
  const panel = el('aside', { class: 'preview', 'aria-label': 'Aperçu' });

  panel.appendChild(
    el('div', { class: 'preview__header' }, [
      el('div', { class: 'preview__title', title: resource.name }, resource.name),
      iconBtn('download', 'Télécharger', () => handlers.onDownload(resource)),
      iconBtn('close', 'Fermer', () => handlers.onClose()),
    ]),
  );

  const body = el('div', { class: 'preview__body' });
  panel.appendChild(body);

  const placeholder = (msg: string): void => {
    clear(body);
    body.appendChild(el('div', { class: 'preview__placeholder' }, msg));
    body.appendChild(meta(resource));
  };

  const category = categoryFor(resource.name, resource.contentType);

  if (resource.size > MAX_PREVIEW_BYTES && category !== 'binary') {
    placeholder(`Fichier trop volumineux pour l’aperçu (> ${formatSize(MAX_PREVIEW_BYTES)}). Téléchargez-le pour le consulter.`);
    return panel;
  }

  body.appendChild(
    el('div', { class: 'preview__placeholder' }, [
      el('div', { class: 'spinner' }),
    ]),
  );
  body.appendChild(meta(resource));

  loadPreview(resource, client, category)
    .then((node) => {
      clear(body);
      body.appendChild(node);
      body.appendChild(meta(resource));
    })
    .catch((err) => {
      placeholder(`Impossible de charger l’aperçu : ${err instanceof Error ? err.message : String(err)}`);
    });

  return panel;
}

async function loadPreview(
  resource: WebDAVResource,
  client: WebDAVClient,
  category: FileCategory,
): Promise<HTMLElement> {
  switch (category) {
    case 'image': {
      const blob = await client.download(resource.path);
      const url = URL.createObjectURL(blob);
      const img = el('img', { src: url, alt: resource.name }) as HTMLImageElement;
      const wrap = el('div', { class: 'preview__media' }, [img]);
      objectUrls.set(wrap, url);
      img.addEventListener('load', () => {
        /* keep the URL alive while the node lives */
      }, { once: true });
      return wrap;
    }
    case 'video': {
      const blob = await client.download(resource.path);
      const url = URL.createObjectURL(blob);
      const video = el('video', { src: url, controls: 'controls', preload: 'metadata' }) as HTMLVideoElement;
      const wrap = el('div', { class: 'preview__media' }, [video]);
      objectUrls.set(wrap, url);
      return wrap;
    }
    case 'audio': {
      const blob = await client.download(resource.path);
      const url = URL.createObjectURL(blob);
      const audio = el('audio', { src: url, controls: 'controls', style: 'width: 100%;' }) as HTMLAudioElement;
      const wrap = el('div', { class: 'preview__media' }, [audio]);
      objectUrls.set(wrap, url);
      return wrap;
    }
    case 'pdf': {
      const blob = await client.download(resource.path);
      const url = URL.createObjectURL(blob);
      const frame = el('iframe', { src: url, title: resource.name }) as HTMLIFrameElement;
      const wrap = el('div', { class: 'preview__media' }, [frame]);
      objectUrls.set(wrap, url);
      return wrap;
    }
    case 'markdown': {
      const text = await readText(resource, client);
      const wrap = el('div', { class: 'preview__markdown' });
      wrap.innerHTML = renderMarkdown(text);
      return wrap;
    }
    case 'text':
    case 'code': {
      const text = await readText(resource, client);
      return el('pre', { class: 'preview__text' }, text);
    }
    default:
      return el('div', { class: 'preview__placeholder' }, [
        'Aucun aperçu disponible pour ce type de fichier.',
      ]);
  }
}

async function readText(resource: WebDAVResource, client: WebDAVClient): Promise<string> {
  const blob = await client.download(resource.path);
  if (blob.size > MAX_TEXT_BYTES) {
    const head = blob.slice(0, MAX_TEXT_BYTES);
    return (await head.text()) + '\n\n… (fichier tronqué pour l’aperçu)';
  }
  return blob.text();
}

function meta(resource: WebDAVResource): HTMLElement {
  return el('dl', { class: 'preview__meta' }, [
    el('dt', {}, 'Type'),
    el('dd', {}, resource.contentType || (resource.kind === 'directory' ? 'dossier' : 'binaire')),
    el('dt', {}, 'Taille'),
    el('dd', {}, resource.kind === 'directory' ? '—' : formatSize(resource.size)),
    el('dt', {}, 'Modifié'),
    el('dd', {}, formatDate(resource.lastModified)),
    el('dt', {}, 'Chemin'),
    el('dd', {}, `/${resource.path}`),
  ]);
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

export function revokePreviewUrls(node: HTMLElement | null): void {
  if (!node) return;
  const url = objectUrls.get(node);
  if (url) URL.revokeObjectURL(url);
  for (const child of Array.from(node.children) as HTMLElement[]) {
    revokePreviewUrls(child);
  }
}
