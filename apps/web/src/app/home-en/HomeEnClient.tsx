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
 * English homepage, structured after Appendix 2 ("Front-End GUI Design",
 * Module 2.0 — Home Page) of the platform's Functional Requirements
 * Specification: a six-item primary nav (Trees / Individuals / Families /
 * VCC / Picture Archive / Document Archive), Sign In / Register at top
 * right, and four homepage sections (2.1 Who We Are, 2.2 Why Are We Doing
 * This, 2.3 How Does This Work, 2.4 Contact Us).
 *
 * Standalone preview at /home-en — deliberately not linked from the live
 * (Arabic-first) homepage or global nav; see chat for context.
 */

const PRIMARY_NAV = [
  { label: 'Trees', href: '/tree', icon: TreeDeciduous, available: true },
  { label: 'Individuals', href: '/search', icon: UserSearch, available: true },
  { label: 'Families', href: '/families', icon: Users, available: true },
  { label: 'VCC', href: '/villages', icon: MapPin, available: true },
  { label: 'Picture Archive', href: '#', icon: ImageIcon, available: false },
  { label: 'Document Archive', href: '#', icon: FileText, available: false },
];

const SECTIONS = [
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
        English homepage preview — structured per FRS Appendix 2 · Module 2.0. Not linked from the live site.
      </div>

      {/* Top utility bar */}
      <div className="border-b border-[var(--jt-stone-200)] bg-[var(--jt-olive-800)] px-5 py-2 text-[var(--jt-stone-50)]">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
          <span className="text-xs tracking-wide text-[var(--jt-olive-100)]">
            Palestinian Roots Platform — one family tree for every Palestinian, everywhere.
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[var(--jt-olive-400)]/60 px-3 py-1 text-xs font-semibold transition-colors hover:bg-[var(--jt-olive-700)]"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-[var(--jt-gold-400)] px-3 py-1 text-xs font-bold text-[var(--jt-olive-900)] transition-colors hover:bg-[var(--jt-gold-300)]"
            >
              Register
            </Link>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--jt-stone-200)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-6 px-5">
          <Link href="/home-en" className="flex items-center gap-2 shrink-0">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)]"
            >
              <TreeDeciduous className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-[var(--jt-olive-800)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
              Juthoor
            </span>
          </Link>

          <nav className="ms-2 flex flex-1 items-center gap-1 overflow-x-auto">
            {PRIMARY_NAV.map((item) => (
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
                <item.icon className="h-4 w-4" />
                {item.label}
                {!item.available && (
                  <span className="ms-1 rounded-full bg-[var(--jt-stone-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--jt-stone-500)]">
                    Soon
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--jt-olive-800)] hover:bg-[var(--jt-olive-50)]"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-[var(--jt-olive-600)] px-4 py-2 text-sm font-semibold text-[var(--jt-stone-50)] transition-colors hover:bg-[var(--jt-olive-700)]"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-screen-2xl px-5 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 flex justify-center md:order-1">
            <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-[var(--jt-olive-50)] shadow-[var(--jt-shadow-md)]">
              <Image
                src="/images/hero-key-placeholder.svg"
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

      {/* 2.1–2.4 sections */}
      <section className="mx-auto max-w-screen-2xl px-5 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.ref}
              href={s.href}
              className="group flex flex-col rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-6 transition-all hover:-translate-y-1 hover:border-[var(--jt-olive-300)] hover:shadow-[var(--jt-shadow-md)]"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--jt-olive-50)] text-[var(--jt-olive-700)]">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-olive-600)]">
                {s.ref}
              </span>
              <h2 className="mb-2 text-lg font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                {s.title}
              </h2>
              <p className="text-sm text-[var(--jt-stone-600)]">{s.body}</p>
            </Link>
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
