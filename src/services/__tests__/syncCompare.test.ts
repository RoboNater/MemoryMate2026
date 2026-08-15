import { isNewer } from '../syncCompare';

describe('isNewer', () => {
  it('returns true when a is strictly newer than b', () => {
    expect(isNewer('2026-08-14T10:00:01.000Z', '2026-08-14T10:00:00.000Z')).toBe(true);
  });

  it('returns false when a is strictly older than b', () => {
    expect(isNewer('2026-08-14T10:00:00.000Z', '2026-08-14T10:00:01.000Z')).toBe(false);
  });

  it('returns false when timestamps are exactly equal (last-write-wins must be non-oscillating)', () => {
    const t = '2026-08-14T10:00:00.000Z';
    expect(isNewer(t, t)).toBe(false);
  });

  describe('null / undefined / empty string handling (treated as oldest)', () => {
    const present = '2026-08-14T10:00:00.000Z';

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
    ])('a real timestamp is newer than a %s b, but never vice versa', (_label, missing) => {
      expect(isNewer(present, missing)).toBe(true);
      expect(isNewer(missing, present)).toBe(false);
    });

    it.each([
      [null, null],
      [undefined, undefined],
      ['', ''],
      [null, undefined],
      [undefined, ''],
      ['', null],
    ])('both sides missing (%p, %p) is always false', (a, b) => {
      expect(isNewer(a, b)).toBe(false);
    });
  });

  describe('differently-formatted-but-equal ISO strings', () => {
    it('milliseconds vs. no-milliseconds form of the same instant are equal', () => {
      expect(isNewer('2026-08-14T10:00:00.000Z', '2026-08-14T10:00:00Z')).toBe(false);
      expect(isNewer('2026-08-14T10:00:00Z', '2026-08-14T10:00:00.000Z')).toBe(false);
    });

    it('a +00:00 offset form is equal to the Z form', () => {
      expect(isNewer('2026-08-14T10:00:00.000Z', '2026-08-14T10:00:00.000+00:00')).toBe(false);
    });

    it('a non-zero offset resolving to the same instant is treated as equal', () => {
      expect(isNewer('2026-08-14T10:00:00.000Z', '2026-08-14T12:00:00.000+02:00')).toBe(false);
    });
  });

  describe('sub-second differences', () => {
    it('detects a 1ms difference', () => {
      expect(isNewer('2026-08-14T10:00:00.001Z', '2026-08-14T10:00:00.000Z')).toBe(true);
      expect(isNewer('2026-08-14T10:00:00.000Z', '2026-08-14T10:00:00.001Z')).toBe(false);
    });
  });

  describe('unparseable garbage input (documents current behavior, not a fix)', () => {
    // Date.parse('garbage') is NaN, and any comparison against NaN is false,
    // so a corrupt updated_at silently loses every comparison instead of
    // throwing -- neither newer than, nor older than, anything, including
    // itself.
    it.each([
      ['not-a-real-date', '2026-08-14T10:00:00.000Z'],
      ['2026-08-14T10:00:00.000Z', 'not-a-real-date'],
      ['not-a-real-date', 'also-garbage'],
      ['not-a-real-date', 'not-a-real-date'],
    ])('isNewer(%p, %p) is false', (a, b) => {
      expect(isNewer(a, b)).toBe(false);
    });
  });
});
