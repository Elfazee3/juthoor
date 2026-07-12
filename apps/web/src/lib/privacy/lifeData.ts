/**
 * Whether to hide a living person's life data (birth year, birthplace) from a
 * viewer.
 *
 * Living people are masked from anyone WITHOUT privileged (owner /
 * approved-member) access to the tree — a public view must not broadcast a
 * living person's birth year + village of origin (plan §5.5). Deceased people
 * are never masked by this rule.
 */
export function shouldHideLifeData(
  isLiving: boolean,
  privileged: boolean
): boolean {
  return isLiving && !privileged;
}
