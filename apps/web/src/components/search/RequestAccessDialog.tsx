'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, ShieldCheck, FileText } from 'lucide-react';
import { getProofUploadTarget, submitAccessRequest } from '@/data/user/access';
import { createClient } from '@supabase/supabase-js';

type Role = 'read_only' | 'collaborator';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = /\.(jpe?g|png|webp|pdf)$/i;

export function RequestAccessDialog({
  open,
  onClose,
  treeId,
  treeName,
  t,
}: {
  open: boolean;
  onClose: () => void;
  treeId: string;
  treeName: string;
  t: <T extends string>(ar: T, en: T) => T;
}) {
  const [role, setRole] = useState<Role>('read_only');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onPickFile(f: File | null) {
    setError(null);
    if (!f) { setFile(null); return; }
    if (!ALLOWED.test(f.name)) { setError(t('نوع الملف غير مدعوم', 'File type not supported')); return; }
    if (f.size > MAX_BYTES) { setError(t('الملف كبير جدًا (الحد ١٠ ميغا)', 'File too large (10MB max)')); return; }
    setFile(f);
  }

  async function submit() {
    if (!file) { setError(t('رجاءً ارفع مستندًا يثبت القرابة', 'Please upload a proof document')); return; }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const { path, token } = await getProofUploadTarget({ treeId, fileExtension: ext });

      // Perform the direct upload with the client SDK (server-signed URL)
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
      const browser = createClient(url, key);
      const { error: upErr } = await browser.storage.from('proof-of-family').uploadToSignedUrl(path, token, file);
      if (upErr) throw new Error(upErr.message);

      await submitAccessRequest({ treeId, role, proofUrl: path, note: note.trim() || undefined });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--jt-stone-900)]/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl border border-[var(--jt-olive-200)] bg-[var(--card)] p-6 shadow-[var(--jt-shadow-xl)] md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute end-4 top-4 rounded-full p-2 text-[var(--jt-stone-500)] transition-colors hover:bg-[var(--jt-stone-100)] hover:text-[var(--jt-stone-800)]"
              aria-label={t('إغلاق', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>

            {success ? (
              <div className="text-center">
                <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[var(--jt-confidence-certain)]" />
                <h2 className="text-2xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                  {t('تمّ إرسال طلبك', 'Your request was sent')}
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--jt-stone-600)]">
                  {t(
                    'سيراجع صاحب الشجرة مستندك ويقرّر. سنُعلمك عند تغيّر الحالة.',
                    'The tree owner will review your document and decide. We\'ll notify you when the status changes.',
                  )}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 rounded-full bg-[var(--jt-olive-700)] px-6 py-2 text-sm font-semibold text-[var(--jt-stone-50)] hover:bg-[var(--jt-olive-800)]"
                >
                  {t('تمام', 'Done')}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                  {t('طلب وصول', 'Access request')}
                </p>
                <h2 className="text-2xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                  {treeName}
                </h2>
                <p className="mt-2 text-sm text-[var(--jt-stone-600)]">
                  {t(
                    'أرفق مستندًا يثبت قرابتك (بطاقة عائليّة، جواز، وثيقة عقارية، الخ). لن يراه سوى صاحب الشجرة.',
                    'Attach a document proving your family tie (family card, passport, land deed, etc). Only the tree owner will see it.',
                  )}
                </p>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
                      {t('الصلاحية المطلوبة', 'Requested role')}
                    </label>
                    <div className="flex gap-2">
                      <RoleButton active={role === 'read_only'} onClick={() => setRole('read_only')} label={t('قراءة فقط', 'Read only')} />
                      <RoleButton active={role === 'collaborator'} onClick={() => setRole('collaborator')} label={t('مُشارك (قراءة + كتابة)', 'Collaborator (read + write)')} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
                      {t('مستند الإثبات', 'Proof document')}
                    </label>
                    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--jt-olive-300)] bg-[var(--jt-olive-50)]/30 p-6 text-sm text-[var(--jt-olive-800)] transition-colors hover:bg-[var(--jt-olive-50)]/60">
                      <Upload className="h-5 w-5" />
                      <span className="font-semibold">
                        {file ? file.name : t('اسحب ملفًا أو انقر للاختيار', 'Drop or click to select')}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                    {file && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--jt-stone-500)]">
                        <FileText className="h-3 w-3" />
                        {Math.round(file.size / 1024)} KB · {file.type || 'unknown'}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-[var(--jt-stone-500)]">
                      JPG · PNG · WebP · PDF · ≤ 10MB
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
                      {t('ملاحظة (اختياري)', 'Note (optional)')}
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder={t('ابن عمّ والدي، وجدتنا اسمها...', 'My father\'s cousin — our grandmother was…')}
                      className="w-full rounded-xl border border-[var(--jt-stone-200)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--jt-olive-400)] focus:ring-2 focus:ring-[var(--jt-olive-100)]"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-[var(--jt-terra-50)] p-3 text-sm text-[var(--jt-terra-700)]">{error}</div>
                  )}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={uploading || !file}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--jt-olive-700)] px-6 py-3 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-all hover:bg-[var(--jt-olive-800)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {t('إرسال الطلب', 'Submit request')}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RoleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-[var(--jt-olive-700)] bg-[var(--jt-olive-700)] text-[var(--jt-stone-50)]'
          : 'border-[var(--jt-stone-200)] bg-[var(--background)] text-[var(--jt-stone-700)] hover:bg-[var(--jt-olive-50)]'
      }`}
    >
      {label}
    </button>
  );
}
