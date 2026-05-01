'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/utils/cn';

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--jt-stone-200)] bg-[var(--jt-stone-50)]/80 p-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[var(--jt-shadow-sm)] backdrop-blur',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLocale('ar')}
        aria-pressed={locale === 'ar'}
        className={cn(
          'rounded-full px-3 py-1 transition-colors',
          locale === 'ar'
            ? 'bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)] shadow-sm'
            : 'text-[var(--jt-stone-600)] hover:text-[var(--jt-olive-700)]',
        )}
        style={{ fontFamily: 'var(--jt-font-arabic)' }}
      >
        ع
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        className={cn(
          'rounded-full px-3 py-1 transition-colors',
          locale === 'en'
            ? 'bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)] shadow-sm'
            : 'text-[var(--jt-stone-600)] hover:text-[var(--jt-olive-700)]',
        )}
      >
        EN
      </button>
    </div>
  );
}
