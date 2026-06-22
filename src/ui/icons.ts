/**
 * Inline SVG icons — no external icon font dependency, no extra HTTP request,
 * fully themable via `currentColor`. Each function returns the same SVG
 * markup so the call sites stay short.
 *
 * Source set: stripped-down Lucide-style outlines.
 */

type IconBuilder = (size?: number) => string;

const svg = (path: string, size = 16): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const icons: Record<string, IconBuilder> = {
  leaf: (s) =>
    svg(
      '<path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 14-9-1 9-4 16-12 16Z"/><path d="M2 22 14 10"/>',
      s,
    ),
  cloud: (s) =>
    svg('<path d="M18 18H6a4 4 0 0 1 0-8 6 6 0 0 1 11.66-1.7A4 4 0 0 1 18 18Z"/>', s),
  folder: (s) =>
    svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', s),
  folderPlus: (s) =>
    svg(
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M12 11v6m-3-3h6"/>',
      s,
    ),
  file: (s) =>
    svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>', s),
  fileImage: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><circle cx="10" cy="13" r="1.5"/><path d="m8 18 3-3 5 5"/>',
      s,
    ),
  fileVideo: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="m11 13 3 2-3 2Z"/>',
      s,
    ),
  fileAudio: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M11 18v-5l4-1v5"/>',
      s,
    ),
  fileText: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6m-6 3h4"/>',
      s,
    ),
  fileCode: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="m10 13-2 2 2 2m4-4 2 2-2 2"/>',
      s,
    ),
  fileArchive: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M11 6v2m0 2v2m0 2v2"/>',
      s,
    ),
  filePdf: (s) =>
    svg(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 14v-1h2v3H9v-2Zm4 0h2v2h-2zm0-1h2"/>',
      s,
    ),
  upload: (s) =>
    svg('<path d="M12 4v12"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>', s),
  download: (s) =>
    svg('<path d="M12 4v12"/><path d="m6 14 6 6 6-6"/><path d="M4 20h16"/>', s),
  trash: (s) =>
    svg('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>', s),
  edit: (s) =>
    svg('<path d="M4 20h4l11-11-4-4L4 16Z"/><path d="m13 6 4 4"/>', s),
  refresh: (s) => svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', s),
  logout: (s) =>
    svg('<path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M13 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2"/>', s),
  close: (s) => svg('<path d="m6 6 12 12M6 18 18 6"/>', s),
  check: (s) => svg('<path d="m5 12 5 5 9-12"/>', s),
  alert: (s) => svg('<path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/>', s),
  eye: (s) => svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', s),
  eyeOff: (s) =>
    svg('<path d="M9.9 4.2A10 10 0 0 1 12 4c6 0 10 7 10 7a17 17 0 0 1-2.8 3.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M6.7 6.7A17 17 0 0 0 2 11s4 7 10 7c1.6 0 3-.3 4.2-.8"/><path d="m2 2 20 20"/>', s),
  server: (s) =>
    svg('<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01M7 17h.01"/>', s),
  user: (s) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', s),
  lock: (s) =>
    svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', s),
  link: (s) =>
    svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>', s),
  info: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', s),
  cancel: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', s),
  retry: (s) => svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', s),
  search: (s) => svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', s),
  caretUp: (s) => svg('<path d="m6 15 6-6 6 6"/>', s),
  caretDown: (s) => svg('<path d="m6 9 6 6 6-6"/>', s),
  sun: (s) =>
    svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.31 11.31 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/>', s),
  moon: (s) => svg('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>', s),
};

export function icon(name: keyof typeof icons, size?: number): string {
  const builder = icons[name];
  return builder ? builder(size) : '';
}
