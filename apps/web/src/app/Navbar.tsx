'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { useLocale } from '@/contexts/LocaleContext';

const NAV_LINK_CLS =
  'relative py-1 transition-colors hover:text-[var(--jt-olive-700)] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-[var(--jt-gold-400)] after:transition-transform after:duration-300 hover:after:scale-x-100';

export default function Navbar() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--jt-stone-200)]/70 bg-[var(--background)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, transparent, var(--jt-olive-400), var(--jt-gold-400), var(--jt-terra-400), transparent)',
        }}
      />
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center px-5 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-transform group-hover:-rotate-3"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21V9" />
              <path d="M12 9c-3-2-5-5-5-7 2 0 5 2 7 4" />
              <path d="M12 9c3-2 5-5 5-7-2 0-5 2-7 4" />
              <path d="M5 17c2 0 4 1 5 3 1-2 3-3 5-3" />
              <path d="M4 13c2-1 4-1 6 1 1-2 3-2 5-1" />
            </svg>
          </span>
          <span className="flex flex-col leading-tight">
            <span
              className="text-xl font-bold text-[var(--jt-olive-700)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              جذور
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-stone-500)]">
              Juthoor
            </span>
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-8 text-sm font-medium text-[var(--jt-stone-600)] md:flex">
          <Link href="/" className={NAV_LINK_CLS}>
            {t('الصفحة الرئيسية', 'Home')}
          </Link>
          <Link href="/tree" className={NAV_LINK_CLS}>
            {t('شجرة العائلة', 'Family Tree')}
          </Link>
          <Link href="/search" className={NAV_LINK_CLS}>
            {t('ابحث عن ذويك', 'Find family')}
          </Link>
          <Link href="/about" className={NAV_LINK_CLS}>
            {t('عن جذور', 'About')}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LocaleToggle />
          <ModeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden text-[var(--jt-stone-700)] hover:text-[var(--jt-olive-700)] sm:inline-flex">
            <Link href="/login">{t('تسجيل الدخول', 'Sign in')}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="jt-btn-shine bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-olive-700)] hover:shadow-[var(--jt-shadow-md)]"
          >
            <Link href="/sign-up">{t('ابدأ شجرتك', 'Start your tree')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
