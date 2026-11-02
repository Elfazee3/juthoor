/**
 * Reads the GEDCOM text out of an upload request: a multipart form with a
 * `file` field, or a raw text body. Shared by both import routes.
 */

import type { NextRequest } from 'next/server';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB per Step-3 decision

/** A problem with the upload itself, with the HTTP status to answer with. */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export interface GedcomUpload {
  readonly text: string;
  /** Name of the uploaded file, when sent as a file. */
  readonly fileName?: string;
  /** Optional `name` form field (the new tree's name). */
  readonly treeName?: string;
}

export async function readGedcomUpload(req: NextRequest): Promise<GedcomUpload> {
  const contentType = req.headers.get('content-type') ?? '';
  let text: string;
  let fileName: string | undefined;
  let treeName: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    // not `instanceof File`: the File class differs between runtimes
    if (file === null || typeof file === 'string') {
      throw new UploadError('No file uploaded under "file" field', 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new UploadError(
        `File exceeds the 5 MB limit (got ${Math.round(file.size / 1024)} KB)`,
        413
      );
    }
    text = await file.text();
    fileName = file.name;
    const name = formData.get('name');
    if (typeof name === 'string') treeName = name;
  } else {
    const bodyText = await req.text();
    if (bodyText.length > MAX_UPLOAD_BYTES) {
      throw new UploadError('Body exceeds the 5 MB limit', 413);
    }
    text = bodyText;
  }

  if (!text.trim()) {
    throw new UploadError('Uploaded GEDCOM is empty', 400);
  }
  return { text, fileName, treeName };
}

/** The name for a tree created from an upload: the form field, else the file name. */
export function newTreeName(upload: GedcomUpload, fallback: string): string {
  const fromField = upload.treeName?.trim();
  if (fromField) return fromField.slice(0, 100);
  const fromFile = upload.fileName?.replace(/\.(ged|gedcom)$/i, '').trim();
  if (fromFile) return fromFile.slice(0, 100);
  return fallback;
}
