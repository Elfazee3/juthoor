/**
 * Shared types for rendering legal documents (Privacy Policy, Terms & Conditions).
 *
 * The documents were originally drafted in English. Per the documents themselves,
 * the Arabic version is the official one and prevails in any conflict — so each
 * block carries an optional `ar` that, when present, is shown in Arabic locale.
 * Both privacyContent.ts and termsContent.ts now carry a full draft Arabic
 * translation for every block, but it is a draft pending legal/native-reviewer
 * sign-off before it is treated as the binding text (see the "under legal
 * review" notice in {@link LegalDocumentView}). A block without `ar` falls back
 * to English with `dir="ltr"` so punctuation renders correctly inside an RTL page.
 */

export type LegalBlock =
  | { type: 'p'; en: string; ar?: string }
  | { type: 'list'; ordered?: boolean; items: { en: string; ar?: string }[] }
  | {
      type: 'defs';
      rows: { termEn: string; termAr?: string; defEn: string; defAr?: string }[];
    }
  | {
      type: 'callout';
      tone?: 'olive' | 'gold' | 'terra';
      titleEn?: string;
      titleAr?: string;
      en: string;
      ar?: string;
    };

export type LegalSection = {
  /** Stable anchor id, e.g. "privacy-3" or "terms-art-6". */
  id: string;
  /** Section/article number label, e.g. "3" or "Article 6". */
  numberEn?: string;
  numberAr?: string;
  titleEn: string;
  titleAr: string;
  blocks: LegalBlock[];
  /** Optional non-binding plain-language summary (Terms uses these). */
  summary?: { en: string; ar: string };
};

export type LegalDocument = {
  kind: 'privacy' | 'terms';
  titleEn: string;
  titleAr: string;
  /** Short subtitle under the title. */
  subtitleEn: string;
  subtitleAr: string;
  versionEn: string;
  versionAr: string;
  effectiveEn: string;
  effectiveAr: string;
  /** The bilingual "important notice" that appears at the top of each document. */
  importantNoticeEn: string;
  importantNoticeAr: string;
  sections: LegalSection[];
  /** Contact line at the foot of the document. */
  contactEn: string;
  contactAr: string;
};
