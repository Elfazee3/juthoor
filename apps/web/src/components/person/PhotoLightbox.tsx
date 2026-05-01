'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Star, StarOff, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import type { Attachment } from '@/data/user/attachments';

export function PhotoLightbox({
  open,
  photos,
  index,
  onClose,
  onPrev,
  onNext,
  onSetPrimary,
  onClearPrimary,
  onDelete,
  primaryId,
  canManage,
  t,
}: {
  open: boolean;
  photos: Attachment[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSetPrimary: (id: string) => void;
  onClearPrimary: () => void;
  onDelete: (id: string) => void;
  primaryId: string | null;
  canManage: boolean;
  t: <T extends string>(ar: T, en: T) => T;
}) {
  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onPrev, onNext]);

  const current = photos[index];
  const isPrimary = current && primaryId === current.id;

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label={t('إغلاق', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                aria-label={t('السابق', 'Previous')}
              >
                <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                aria-label={t('التالي', 'Next')}
              >
                <ChevronRight className="h-6 w-6 rtl:rotate-180" />
              </button>
            </>
          )}

          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative flex max-h-[90vh] max-w-[92vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {current.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.signed_url}
                alt={current.caption_ar ?? current.caption_en ?? 'photo'}
                className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <div className="rounded-2xl bg-[var(--jt-stone-100)] p-20 text-[var(--jt-stone-500)]">
                {t('تعذّر تحميل الصورة', 'Failed to load image')}
              </div>
            )}

            {(current.caption_ar || current.caption_en || current.year) && (
              <p className="mt-4 max-w-2xl text-center text-sm text-[var(--jt-stone-100)]">
                {current.caption_ar ?? current.caption_en}
                {current.year ? ` · ${current.year}` : ''}
              </p>
            )}

            {canManage && (
              <div className="mt-4 flex items-center gap-2">
                {isPrimary ? (
                  <button
                    type="button"
                    onClick={onClearPrimary}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jt-gold-400)] px-4 py-2 text-xs font-bold text-[var(--jt-olive-900)]"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {t('الصورة الأساسية', 'Primary photo')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(current.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    <StarOff className="h-3.5 w-3.5" />
                    {t('اجعلها الأساسية', 'Set as primary')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(current.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jt-terra-500)]/80 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--jt-terra-500)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('حذف', 'Delete')}
                </button>
              </div>
            )}

            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/50">
              {index + 1} / {photos.length}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
