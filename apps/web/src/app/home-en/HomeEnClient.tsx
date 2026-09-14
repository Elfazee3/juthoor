'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Heart,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Route as RouteIcon,
  TreeDeciduous,
  Users,
  UserSearch,
} from 'lucide-react';

/**
 * English homepage, structured after the platform's own hand-drawn Home
 * Page wireframe ("1 E Home Page.pdf") and FRS Appendix 2 ("Front-End GUI
 * Design", Module 2.0 — Home Page):
 *
 *  Bar 1: Home / Trees / Individuals / Families / VCC / Picture Archive /
 *         Document Archive  ...............................  Log In / Register
 *  Bar 2: [logo]  Who We Are | Why Are We Doing This | How Does This Work | Contact Us
 *  Body:  Who We Are -> Why Are We Doing This -> How Does This Work -> Contact Us,
 *         drawn in the wireframe as one connected vertical flow, not a card grid.
 *
 * Standalone preview at /home-en — deliberately not linked from the live
 * (Arabic-first) homepage or global nav; see chat for context.
 */

const MODULE_NAV = [
  { label: 'Home', href: '/home-en', icon: null, available: true },
  { label: 'Trees', href: '/tree', icon: TreeDeciduous, available: true },
  { label: 'Individuals', href: '/search', icon: UserSearch, available: true },
  { label: 'Families', href: '/families', icon: Users, available: true },
  { label: 'VCC', href: '/villages', icon: MapPin, available: true },
  { label: 'Picture Archive', href: '#', icon: ImageIcon, available: false },
  { label: 'Document Archive', href: '#', icon: FileText, available: false },
];

const FLOW_SECTIONS = [
  {
    ref: '2.1',
    icon: Info,
    title: 'Who We Are',
    body: 'A non-profit, community-built platform connecting the 15.2 million Palestinians scattered across the world through one unified family tree.',
    href: '/about',
  },
  {
    ref: '2.2',
    icon: Heart,
    title: 'Why Are We Doing This',
    body: 'Identity, the right of return, and why documenting family history matters now more than ever.',
    href: '/why',
  },
  {
    ref: '2.3',
    icon: RouteIcon,
    title: 'How Does This Work',
    body: 'Building your tree, privacy and access controls, and how individual trees link into the Palestinian Family Tree.',
    href: '/how',
  },
  {
    ref: '2.4',
    icon: Mail,
    title: 'Contact Us',
    body: 'Questions, partnerships, corrections, and support — reach the team behind the platform.',
    href: '/contact',
  },
];

export function HomeEnClient() {
  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-[var(--jt-stone-50)]" style={{ fontFamily: 'var(--jt-font-latin)' }}>
      {/* Preview notice */}
      <div className="bg-[var(--jt-olive-900)] px-4 py-2 text-center text-xs font-medium text-[var(--jt-olive-100)]">
        English homepage preview — structured per the platform's Home Page wireframe and FRS Appendix 2 · Module 2.0. Not linked from the live site.
      </div>

      {/* Bar 1 — module nav + login */}
      <header className="sticky top-0 z-40 border-b border-[var(--jt-stone-200)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-1 px-5">
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {MODULE_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.available ? item.href : '#'}
                aria-disabled={!item.available}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  item.available
                    ? 'text-[var(--jt-stone-700)] hover:bg-[var(--jt-olive-50)] hover:text-[var(--jt-olive-700)]'
                    : 'cursor-default text-[var(--jt-stone-400)]'
                }`}
                onClick={(e) => {
                  if (!item.available) e.preventDefault();
                }}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
                {!item.available && (
                  <span className="ms-1 rounded-full bg-[var(--jt-stone-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--jt-stone-500)]">
                    Soon
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <Link
            href="/login"
            className="shrink-0 rounded-full bg-[var(--jt-olive-600)] px-4 py-2 text-sm font-semibold text-[var(--jt-stone-50)] transition-colors hover:bg-[var(--jt-olive-700)]"
          >
            Log In / Register
          </Link>
        </div>

        {/* Bar 2 — brand + the four narrative-flow anchors */}
        <div className="border-t border-[var(--jt-stone-100)] bg-[var(--jt-olive-50)]/60">
          <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-6 px-5">
            <Link href="/home-en" className="flex shrink-0 items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)]"
              >
                <TreeDeciduous className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-[var(--jt-olive-800)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                Juthoor
              </span>
            </Link>
            <div className="flex items-center gap-5 overflow-x-auto text-sm text-[var(--jt-stone-600)]">
              {FLOW_SECTIONS.map((s) => (
                <a key={s.ref} href={`#${s.ref}`} className="shrink-0 whitespace-nowrap hover:text-[var(--jt-olive-700)]">
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-screen-2xl px-5 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 flex justify-center md:order-1">
            <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-[var(--jt-olive-50)] shadow-[var(--jt-shadow-md)]">
              <Image
                src="/images/hero-key.jpg"
                alt="An elder's hand and a child's hand together holding an old iron key — the key of return"
                fill
                sizes="(max-width: 768px) 90vw, 400px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="order-1 md:order-2">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
              Non-profit · Free forever · No ads
            </p>
            <h1
              className="text-[clamp(2rem,5vw,3.4rem)] font-bold leading-tight text-[var(--jt-olive-900)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              One family tree for every Palestinian, everywhere.
            </h1>
            <p className="mt-4 max-w-lg text-[var(--jt-stone-700)]">
              Every family recorded is a family remembered. Search for your relatives, build your
              tree, and reconnect it to the wider Palestinian Family Tree — one household, one
              village, one generation at a time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--jt-olive-600)] px-6 py-3 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-colors hover:bg-[var(--jt-olive-700)]"
              >
                Start your tree
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-300)] px-6 py-3 text-sm font-semibold text-[var(--jt-olive-800)] transition-colors hover:bg-[var(--jt-olive-50)]"
              >
                Search for family
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are -> Why -> How -> Contact — one connected vertical flow, per the wireframe */}
      <section className="mx-auto max-w-2xl px-5 pb-24">
        <div className="flex flex-col">
          {FLOW_SECTIONS.map((s, i) => (
            <div key={s.ref} id={s.ref} className="scroll-mt-32">
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)]">
                    <s.icon className="h-5 w-5" />
                  </span>
                  {i < FLOW_SECTIONS.length - 1 && (
                    <span aria-hidden className="my-1 w-px flex-1 bg-[var(--jt-olive-200)]" style={{ minHeight: 56 }} />
                  )}
                </div>
                <div className="pb-10">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-olive-600)]">
                    {s.ref}
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                    {s.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--jt-stone-700)]">{s.body}</p>
                  <Link
                    href={s.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--jt-olive-700)] hover:text-[var(--jt-olive-900)]"
                  >
                    Learn more →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--jt-stone-200)] bg-[var(--jt-stone-50)] px-5 py-8 text-center text-xs text-[var(--jt-stone-500)]">
        Palestinian Roots Platform (Juthoor) — English homepage preview.{' '}
        <Link href="/" className="underline hover:text-[var(--jt-olive-700)]">
          Back to the live site
        </Link>
      </footer>
    </div>
  );
}
