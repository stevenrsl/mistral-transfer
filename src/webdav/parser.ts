/**
 * Namespace-safe PROPFIND multistatus parser.
 *
 * The V1 used `getElementsByTagName('D:response')`, which breaks the moment a
 * server uses a different prefix (`d:`, `lp1:`…). We resolve elements by
 * namespace URI instead.
 */
import { relativeFromHref, basenameOf } from './path';
import type { WebDAVResource } from './types';

const DAV_NS = 'DAV:';

function firstByLocal(parent: Element, local: string): Element | null {
  const list = parent.getElementsByTagNameNS(DAV_NS, local);
  return list.item(0);
}

function textOf(parent: Element, local: string): string {
  return firstByLocal(parent, local)?.textContent?.trim() ?? '';
}

function parseHttpDate(value: string): Date | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

export function parseMultistatus(xml: string, baseUrl: string): WebDAVResource[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  const parseError = doc.getElementsByTagName('parsererror').item(0);
  if (parseError) {
    throw new Error(`Invalid WebDAV XML response: ${parseError.textContent ?? ''}`);
  }

  const responses = Array.from(doc.getElementsByTagNameNS(DAV_NS, 'response'));
  const resources: WebDAVResource[] = [];

  for (const response of responses) {
    const hrefRaw = textOf(response, 'href');
    if (!hrefRaw) continue;

    // Take the propstat block that returned 200 OK.
    const propstats = Array.from(response.getElementsByTagNameNS(DAV_NS, 'propstat'));
    const okPropstat = propstats.find((ps) => {
      const status = firstByLocal(ps, 'status')?.textContent ?? '';
      return status.includes(' 200 ');
    });
    if (!okPropstat) continue;

    const prop = firstByLocal(okPropstat, 'prop');
    if (!prop) continue;

    const path = relativeFromHref(baseUrl, hrefRaw);
    const resourceType = firstByLocal(prop, 'resourcetype');
    const isCollection =
      !!resourceType && resourceType.getElementsByTagNameNS(DAV_NS, 'collection').length > 0;

    const displayName = textOf(prop, 'displayname') || basenameOf(path);
    const sizeRaw = textOf(prop, 'getcontentlength');
    const contentType = textOf(prop, 'getcontenttype');
    const lastModifiedRaw = textOf(prop, 'getlastmodified');
    const etag = textOf(prop, 'getetag') || null;

    resources.push({
      name: displayName,
      path,
      kind: isCollection ? 'directory' : 'file',
      size: sizeRaw ? Number.parseInt(sizeRaw, 10) || 0 : 0,
      contentType,
      lastModified: parseHttpDate(lastModifiedRaw),
      etag,
    });
  }

  return resources;
}
