import {
  FileText,
  Image as ImageIcon,
  MapPin,
  TreeDeciduous,
  Users,
  UserSearch,
} from 'lucide-react';

/**
 * Shared site nav structure, per FRS Appendix 2 (Module 2.0 — Home Page):
 * Home / Trees / Individuals / Families / VCC / Picture Archive / Document
 * Archive. Used by both Navbar.tsx (desktop) and MobileNavigation.tsx
 * (hamburger menu) — kept in its own module so neither imports the other
 * for this data (that circular import previously crashed the app with a
 * "Cannot access 'NAV_ITEMS' before initialization" error).
 */
export const NAV_ITEMS = [
  { href: '/', ar: 'الرئيسية', en: 'Home', icon: null, available: true },
  { href: '/tree', ar: 'الشجرة', en: 'Trees', icon: TreeDeciduous, available: true },
  { href: '/search', ar: 'الأفراد', en: 'Individuals', icon: UserSearch, available: true },
  { href: '/families', ar: 'العائلات', en: 'Families', icon: Users, available: true },
  { href: '/villages', ar: 'القرى والمدن', en: 'VCC', icon: MapPin, available: true },
  { href: '#', ar: 'أرشيف الصور', en: 'Picture Archive', icon: ImageIcon, available: false },
  { href: '#', ar: 'أرشيف الوثائق', en: 'Document Archive', icon: FileText, available: false },
];
