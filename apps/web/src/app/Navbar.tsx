'use client';

import Link from 'next/link';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { MobileNavigation } from '@/app/MobileNavigation';
import { NAV_ITEMS } from '@/app/nav-items';
import { useLocale } from '@/contexts/LocaleContext';

const NAV_LINK_CLS =
  'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-[var(--jt-stone-600)] transition-colors hover:bg-[var(--jt-olive-50)] hover:text-[var(--jt-olive-700)]';

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

        <nav className="mx-4 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.en}
              href={item.available ? item.href : '#'}
              aria-disabled={!item.available}
              className={item.available ? NAV_LINK_CLS : `${NAV_LINK_CLS} cursor-default text-[var(--jt-stone-400)] hover:bg-transparent hover:text-[var(--jt-stone-400)]`}
              onClick={(e) => {
                if (!item.available) e.preventDefault();
              }}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {t(item.ar, item.en)}
              {!item.available && (
                <span className="rounded-full bg-[var(--jt-stone-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--jt-stone-500)]">
                  {t('قريبًا', 'Soon')}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <MobileNavigation />
          <LocaleToggle />
          <ModeToggle />
          <Link
            href="/login"
            className="jt-btn-shine hidden shrink-0 rounded-full bg-[var(--jt-gold-500)] px-4 py-2 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-gold-600)] hover:shadow-[var(--jt-shadow-md)] sm:inline-flex"
          >
            {t('تسجيل الدخول / التسجيل', 'Log In / Register')}
          </Link>
        </div>
      </div>
    </header>
  );
}
