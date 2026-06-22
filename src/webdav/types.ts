export type ResourceKind = 'directory' | 'file';

export interface WebDAVResource {
  /** Display name (URL-decoded). */
  name: string;
  /** Path relative to the server's WebDAV root, percent-encoded segments preserved. */
  path: string;
  kind: ResourceKind;
  size: number;
  contentType: string;
  lastModified: Date | null;
  etag: string | null;
}

export interface Credentials {
  baseUrl: string;
  username: string;
  password: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0..1 */
  ratio: number;
  /** bytes per second, EMA-smoothed by the caller if needed. */
  speed: number;
}

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'paused'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UploadTask {
  id: string;
  file: File;
  destPath: string;
  status: UploadStatus;
  loaded: number;
  total: number;
  speed: number;
  error: string | null;
  startedAt: number | null;
  /** Offset where the next chunk should resume from. */
  resumeOffset: number;
}

export class WebDAVError extends Error {
  override readonly name = 'WebDAVError';
  constructor(
    message: string,
    readonly status: number,
    readonly method: string,
    readonly url: string,
  ) {
    super(message);
  }
}
