// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { MAX_UPLOAD_BYTES, newTreeName, readGedcomUpload, UploadError } from '../readUpload';

function formRequest(file?: File, name?: string): NextRequest {
  const form = new FormData();
  if (file) form.append('file', file, file.name);
  if (name !== undefined) form.append('name', name);
  return new NextRequest('http://localhost/api/tree/import', { method: 'POST', body: form });
}

describe('readGedcomUpload', () => {
  it('reads the file, its name and the optional tree name', async () => {
    const upload = await readGedcomUpload(
      formRequest(new File(['0 HEAD\n0 TRLR\n'], 'Khatib family.ged'), 'عائلة الخطيب')
    );
    expect(upload.text).toContain('0 HEAD');
    expect(upload.fileName).toBe('Khatib family.ged');
    expect(upload.treeName).toBe('عائلة الخطيب');
  });

  it('rejects a request without a file, an empty file and an oversized file', async () => {
    await expect(readGedcomUpload(formRequest())).rejects.toMatchObject({ status: 400 });
    await expect(
      readGedcomUpload(formRequest(new File(['   '], 'a.ged')))
    ).rejects.toBeInstanceOf(UploadError);
    await expect(
      readGedcomUpload(formRequest(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'big.ged')))
    ).rejects.toMatchObject({ status: 413 });
  });
});

describe('newTreeName', () => {
  it('prefers the typed name, then the file name without its extension, then the fallback', () => {
    expect(newTreeName({ text: 'x', treeName: '  My tree ', fileName: 'a.ged' }, 'F')).toBe('My tree');
    expect(newTreeName({ text: 'x', fileName: 'Khatib family.GED' }, 'F')).toBe('Khatib family');
    expect(newTreeName({ text: 'x' }, 'F')).toBe('F');
  });
});
