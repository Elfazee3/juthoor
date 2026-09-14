'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { NAV_ITEMS } from '@/app/nav-items';

const LINKS = NAV_ITEMS;

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
                    key={l.en}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir === 'rtl' ? 16 : -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={l.available ? l.href : '#'}
                      aria-disabled={!l.available}
                      onClick={(e) => {
                        if (!l.available) e.preventDefault();
                        else setIsOpen(false);
                      }}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-lg font-semibold transition-colors ${
                        l.available ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'cursor-default text-white/40'
                      }`}
                      style={{ fontFamily: 'var(--jt-font-display)' }}
                    >
                      {l.icon && <l.icon className="h-4 w-4" />}
                      {t(l.ar, l.en)}
                      {!l.available && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                          {t('قريبًا', 'Soon')}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="relative mt-auto border-t border-white/15 pt-6"
              >
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="jt-btn-shine inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--jt-gold-500)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--jt-gold-500)] transition-all duration-300 hover:bg-[var(--jt-gold-600)]"
                >
                  {t('تسجيل الدخول', 'Log In / Register')}
                </Link>
              </motion.div>
            </Dialog.Panel>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
