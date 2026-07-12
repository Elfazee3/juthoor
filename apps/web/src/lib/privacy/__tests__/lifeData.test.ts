import { describe, expect, it } from 'vitest';
import { shouldHideLifeData } from '../lifeData';

describe('shouldHideLifeData', () => {
  it('hides a living person from a non-privileged (public) viewer', () => {
    expect(shouldHideLifeData(true, false)).toBe(true);
  });

  it('shows a living person to a privileged (owner/approved) viewer', () => {
    expect(shouldHideLifeData(true, true)).toBe(false);
  });

  it('never hides a deceased person', () => {
    expect(shouldHideLifeData(false, false)).toBe(false);
    expect(shouldHideLifeData(false, true)).toBe(false);
  });
});
