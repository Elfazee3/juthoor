/**
 * Constants for the person-attachments feature. Lives outside the
 * `'use server'` file because Next.js server-action files can only export
 * async functions.
 */
export const ATTACHMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024, // 10MB hard cap (mirrored on the SQL/RLS side)
  maxPerPerson: 20,
  allowedPhotoExt: ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const,
  allowedDocExt: ['pdf'] as const,
} as const;
