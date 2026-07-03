'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, Sprout, X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

const LINKS = [
  { href: '/', ar: 'الصفحة الرئيسية', en: 'Home' },
  { href: '/tree', ar: 'شجرة العائلة', en: 'Family Tree' },
  { href: '/search', ar: 'ابحث عن ذويك', en: 'Find family' },
  { href: '/about', ar: 'عن جذور', en: 'About' },
];

/** Slide-in mobile menu (hamburger) — mirrors the desktop navbar links. */
export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, dir } = useLocale();
  const reduce = useReducedMotion();
  const fromX = reduce ? 0 : dir === 'rtl' ? '100%' : '-100%';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--jt-stone-600)] transition-colors hover:bg-[var(--jt-olive-50)] hover:text-[var(--jt-olive-700)] md:hidden"
        aria-label={t('افتح القائمة', 'Open navigation')}
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Dialog
            static
            open={isOpen}
            onClose={setIsOpen}
            className="fixed inset-0 z-[60] md:hidden"
            aria-label={t('التنقّل', 'Navigation')}
          >
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-[var(--jt-olive-900)]/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <Dialog.Panel
              as={motion.div}
              initial={{ x: fromX, opacity: reduce ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: fromX, opacity: reduce ? 0 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              dir={dir}
              className="fixed inset-y-0 start-0 flex w-full max-w-xs flex-col overflow-y-auto bg-[var(--jt-olive-800)] px-6 pb-8 pt-5 shadow-[var(--jt-shadow-xl)]"
            >
              <div aria-hidden className="jt-tatreez-light pointer-events-none absolute inset-0 opacity-[0.05]" />

              <div className="relative flex items-center justify-between">
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--jt-font-display)' }}>
                  جذور
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t('أغلق القائمة', 'Close navigation')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="relative mt-8 flex flex-col gap-1">
                {LINKS.map((l, i) => (
                  <motion.div
                    key={l.href}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir === 'rtl' ? 16 : -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 text-lg font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                      style={{ fontFamily: 'var(--jt-font-display)' }}
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-[var(--jt-gold-400)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      {t(l.ar, l.en)}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="relative mt-auto flex flex-col gap-3 border-t border-white/15 pt-6"
              >
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
                >
                  {t('تسجيل الدخول', 'Sign in')}
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setIsOpen(false)}
                  className="jt-btn-shine inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--jt-terra-500)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--jt-terra-500)] transition-all duration-300 hover:bg-[var(--jt-terra-600)]"
                >
                  <Sprout className="h-4 w-4" />
                  {t('ابدأ شجرتك', 'Start your tree')}
                </Link>
              </motion.div>
            </Dialog.Panel>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
