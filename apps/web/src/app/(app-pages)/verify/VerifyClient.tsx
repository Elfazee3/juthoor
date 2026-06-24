'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  getVerificationUploadTarget,
  submitVerification,
  type IdDocumentType,
  type IdentityVerification,
} from '@/data/user/identityVerification';

const BUCKET = 'verification-docs';
const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf';

const ID_TYPES: { value: IdDocumentType; ar: string; en: string }[] = [
  { value: 'passport', ar: 'جواز سفر', en: 'Passport' },
  { value: 'national_id', ar: 'بطاقة هوية وطنية', en: 'National ID' },
  { value: 'refugee_card', ar: 'بطاقة تسجيل لاجئ', en: 'Refugee registration card' },
  { value: 'other', ar: 'وثيقة أخرى', en: 'Other document' },
];

async function uploadDoc(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const { path, token } = await getVerificationUploadTarget({ fileExtension: ext });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Storage is not configured');
  const browser = createClient(url, key);
  const { error } = await browser.storage.from(BUCKET).uploadToSignedUrl(path, token, file);
  if (error) throw new Error(error.message);
  return path;
}

export function VerifyClient({
  initialVerification,
}: {
  initialVerification: IdentityVerification | null;
}) {
  const { t, dir } = useLocale();
  const [verification, setVerification] = useState(initialVerification);
  const [idType, setIdType] = useState<IdDocumentType>('passport');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [famFile, setFamFile] = useState<File | null>(null);
  const [famNote, setFamNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = verification?.status;

  async function handleSubmit() {
    if (!idFile) {
      setError(t('يرجى إرفاق وثيقة هوية رسمية أوّلًا.', 'Please attach a government ID first.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const idDocumentPath = await uploadDoc(idFile);
      const familyEvidencePath = famFile ? await uploadDoc(famFile) : undefined;
      const v = await submitVerification({
        idDocumentPath,
        idDocumentType: idType,
        familyEvidencePath,
        familyEvidenceNote: famNote.trim() || undefined,
      });
      setVerification(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذّر الإرسال.', 'Submission failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={dir} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 md:p-8">
      <header className="text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--jt-olive-50)]/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('توثيق الهوية', 'Identity verification')}
        </span>
        <h1 className="text-3xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
          {t('وثّق هويتك وانتماءك للعائلة', 'Verify your identity & family belonging')}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--jt-stone-600)]" style={{ lineHeight: 1.8 }}>
          {t(
            'للحصول على صلاحية تحرير شجرة عائلتك، أرفق وثيقة هوية رسمية ودليلًا على انتمائك للعائلة. يراجعها المسؤول خلال ٢-٣ أيام.',
            'To get edit access to your family tree, attach a government ID and evidence of your belonging to the family. An administrator reviews it within 2–3 days.',
          )}
        </p>
      </header>

      {status === 'approved' ? (
        <StatusCard
          tone="olive"
          icon={CheckCircle2}
          title={t('تم توثيق هويتك', 'Your identity is verified')}
          body={t(
            'تمت الموافقة على طلبك. أصبح بإمكانك تحرير شجرة عائلتك.',
            'Your request was approved. You can now edit your family tree.',
          )}
          note={verification?.reviewer_note}
        />
      ) : status === 'pending' ? (
        <StatusCard
          tone="sand"
          icon={Clock}
          title={t('طلبك قيد المراجعة', 'Your request is under review')}
          body={t(
            'استلمنا وثائقك. تتم المراجعة من قبل المسؤول خلال ٢-٣ أيام، وسنعلمك بالنتيجة.',
            'We received your documents. An administrator will review them within 2–3 days and we will notify you.',
          )}
        />
      ) : (
        <div className="space-y-5">
          {status === 'rejected' && (
            <StatusCard
              tone="terra"
              icon={XCircle}
              title={t('لم تتم الموافقة على الطلب السابق', 'Your previous request was not approved')}
              body={t('يمكنك إعادة الإرسال بوثائق أوضح.', 'You can resubmit with clearer documents.')}
              note={verification?.reviewer_note}
            />
          )}

          <section className="rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-6 shadow-[var(--jt-shadow-sm)]">
            {/* ID type */}
            <label className="mb-4 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
                {t('نوع الوثيقة', 'Document type')}
              </span>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as IdDocumentType)}
                className="rounded-xl border border-[var(--jt-stone-200)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--jt-olive-400)]"
              >
                {ID_TYPES.map((it) => (
                  <option key={it.value} value={it.value}>
                    {t(it.ar, it.en)}
                  </option>
                ))}
              </select>
            </label>

            {/* Gov ID (required) */}
            <FilePicker
              label={t('وثيقة الهوية الرسمية', 'Government ID')}
              hint={t('جواز سفر، بطاقة هوية، أو بطاقة لاجئ', 'Passport, national ID, or refugee card')}
              file={idFile}
              onPick={setIdFile}
            />

            {/* Family evidence (optional) */}
            <div className="mt-4">
              <FilePicker
                label={t('دليل الانتماء للعائلة (اختياري)', 'Family-belonging evidence (optional)')}
                hint={t('سجل عائلي، أو وثيقة تذكر والديك أو جدودك', 'A family record or a document naming your parents/grandparents')}
                file={famFile}
                onPick={setFamFile}
              />
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
                  {t('أو اكتب شهادة (مثل شهادة أحد كبار العائلة)', 'Or write a testimony (e.g. an elder’s testimony)')}
                </span>
                <textarea
                  value={famNote}
                  onChange={(e) => setFamNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t('صلتي بهذه العائلة هي…', 'My connection to this family is…')}
                  className="w-full resize-y rounded-xl border border-[var(--jt-stone-200)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--jt-olive-400)]"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-[var(--jt-terra-50)] p-3 text-sm text-[var(--jt-terra-700)]">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !idFile}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--jt-terra-600)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--jt-terra-700)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t('إرسال للمراجعة', 'Submit for review')}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  tone,
  icon: Icon,
  title,
  body,
  note,
}: {
  tone: 'olive' | 'sand' | 'terra';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  note?: string | null;
}) {
  const styles =
    tone === 'olive'
      ? 'border-[var(--jt-olive-200)]/70 bg-[var(--jt-olive-50)]/60 text-[var(--jt-olive-800)]'
      : tone === 'terra'
        ? 'border-[var(--jt-terra-200)]/70 bg-[var(--jt-terra-50)]/50 text-[var(--jt-terra-700)]'
        : 'border-[var(--jt-sand)]/40 bg-[var(--jt-sand-light,#F7F0E6)]/60 text-[var(--jt-stone-800)]';
  return (
    <section className={`rounded-3xl border p-6 ${styles}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-6 w-6 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--jt-font-display)' }}>
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--jt-stone-700)]" style={{ lineHeight: 1.8 }}>
            {body}
          </p>
          {note && (
            <p className="mt-2 rounded-lg bg-white/50 p-2 text-xs text-[var(--jt-stone-700)]">
              {note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FilePicker({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
        {label}
      </span>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--jt-olive-300)] bg-[var(--jt-olive-50)]/30 p-4 text-sm text-[var(--jt-olive-800)] transition-colors hover:bg-[var(--jt-olive-50)]/60">
        {file ? <FileText className="h-5 w-5 flex-shrink-0" /> : <Upload className="h-5 w-5 flex-shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{file ? file.name : hint}</span>
        </span>
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>
    </div>
  );
}
