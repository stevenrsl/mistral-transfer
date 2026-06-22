export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'markdown'
  | 'code'
  | 'archive'
  | 'binary';

const EXT_CATEGORY: Record<string, FileCategory> = {
  // images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  svg: 'image', avif: 'image', bmp: 'image', ico: 'image',
  // video
  mp4: 'video', webm: 'video', mov: 'video', mkv: 'video', m4v: 'video', ogv: 'video',
  // audio
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio',
  // pdf
  pdf: 'pdf',
  // text / markdown / code
  md: 'markdown', markdown: 'markdown',
  txt: 'text', log: 'text', csv: 'text', tsv: 'text',
  json: 'code', xml: 'code', yaml: 'code', yml: 'code', toml: 'code',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', mjs: 'code', cjs: 'code',
  html: 'code', htm: 'code', css: 'code', scss: 'code', less: 'code',
  py: 'code', rb: 'code', go: 'code', rs: 'code', java: 'code', c: 'code',
  cpp: 'code', h: 'code', sh: 'code', php: 'code', sql: 'code',
  // archive
  zip: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive', rar: 'archive',
};

export function categoryFor(name: string, contentType = ''): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (EXT_CATEGORY[ext]) return EXT_CATEGORY[ext];

  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.startsWith('text/')) return 'text';
  return 'binary';
}
