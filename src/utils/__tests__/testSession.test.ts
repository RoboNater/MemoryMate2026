import {
  decodeTestOutcomes,
  encodeTestOutcomes,
  setTestOutcomeAt,
  summarizeTestOutcomes,
  VerseTestOutcome,
} from '../testSession';

describe('encodeTestOutcomes / decodeTestOutcomes round-trip', () => {
  it('round-trips a mix of pass, fail, skipped, and a gap in the middle', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 85, saved: true },
      null, // not reached yet
      { outcome: 'fail', score: 40, saved: true },
      { outcome: 'skipped', score: null, saved: true },
    ];

    const encoded = encodeTestOutcomes(outcomes);
    expect(decodeTestOutcomes(encoded, outcomes.length)).toEqual(outcomes);
  });

  it('round-trips an outcome with no score (gave up)', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: null, saved: true },
    ];
    const encoded = encodeTestOutcomes(outcomes);
    expect(encoded).toBe('f');
    expect(decodeTestOutcomes(encoded, 1)).toEqual(outcomes);
  });

  it('encodes pass/fail scores as the letter followed by the integer', () => {
    expect(encodeTestOutcomes([{ outcome: 'pass', score: 85, saved: true }])).toBe('p85');
    expect(encodeTestOutcomes([{ outcome: 'fail', score: 40, saved: true }])).toBe('f40');
  });

  it('encodes skipped entries as a bare "s"', () => {
    expect(encodeTestOutcomes([{ outcome: 'skipped', score: null, saved: true }])).toBe('s');
  });

  it('encodes an unreached verse (null) as an empty token', () => {
    expect(encodeTestOutcomes([null, null])).toBe(',');
  });

  it('round-trips a score of exactly 0 and 100', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: 0, saved: true },
      { outcome: 'pass', score: 100, saved: true },
    ];
    expect(decodeTestOutcomes(encodeTestOutcomes(outcomes), 2)).toEqual(outcomes);
  });
});

describe('encodeTestOutcomes / decodeTestOutcomes unsaved marker', () => {
  it('round-trips an unsaved fail and an unsaved pass with a trailing "!"', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: 40, saved: false },
      { outcome: 'pass', score: 85, saved: false },
    ];
    const encoded = encodeTestOutcomes(outcomes);
    expect(encoded).toBe('f40!,p85!');
    expect(decodeTestOutcomes(encoded, 2)).toEqual(outcomes);
  });

  it('emits the marker only when saved is false', () => {
    expect(encodeTestOutcomes([{ outcome: 'pass', score: 85, saved: true }])).toBe('p85');
    expect(encodeTestOutcomes([{ outcome: 'pass', score: 85, saved: false }])).toBe('p85!');
  });

  it('never encodes the marker for a skipped outcome, even when saved is false', () => {
    expect(encodeTestOutcomes([{ outcome: 'skipped', score: null, saved: false }])).toBe('s');
  });

  it('decodes a hand-written "s!" back to saved: true', () => {
    expect(decodeTestOutcomes('s!', 1)).toEqual([
      { outcome: 'skipped', score: null, saved: true },
    ]);
  });
});

describe('decodeTestOutcomes padding and truncation', () => {
  it('pads with null when the encoded string is shorter than length', () => {
    const encoded = encodeTestOutcomes([{ outcome: 'pass', score: 100, saved: true }]);
    expect(decodeTestOutcomes(encoded, 4)).toEqual([
      { outcome: 'pass', score: 100, saved: true },
      null,
      null,
      null,
    ]);
  });

  it('ignores tokens past length rather than including them', () => {
    const encoded = encodeTestOutcomes([
      { outcome: 'pass', score: 100, saved: true },
      { outcome: 'fail', score: 0, saved: true },
      { outcome: 'skipped', score: null, saved: true },
    ]);
    expect(decodeTestOutcomes(encoded, 1)).toEqual([
      { outcome: 'pass', score: 100, saved: true },
    ]);
  });

  it('returns exactly `length` entries for an empty/undefined encoded string', () => {
    expect(decodeTestOutcomes(undefined, 3)).toEqual([null, null, null]);
    expect(decodeTestOutcomes('', 3)).toEqual([null, null, null]);
  });

  it('returns an empty array when length is 0', () => {
    expect(decodeTestOutcomes('p85,f40', 0)).toEqual([]);
  });
});

describe('decodeTestOutcomes garbage tolerance', () => {
  // Defensive: this string arrives from a URL a user can edit by hand, or an
  // old link pointing at data that no longer makes sense. Decoding must never
  // throw -- a blank card beats a crashed screen.
  it('decodes an unrecognized letter as null', () => {
    expect(decodeTestOutcomes('x', 1)).toEqual([null]);
  });

  it('decodes a token with junk after the score as null', () => {
    expect(decodeTestOutcomes('p85abc', 1)).toEqual([null]);
  });

  it('keeps the outcome letter but nulls the score when the score is non-integer', () => {
    // A non-integer never actually round-trips out of encodeTestOutcomes, but
    // a hand-edited URL can still contain one.
    expect(decodeTestOutcomes('p8.5', 1)).toEqual([null]);
  });

  it('keeps the outcome letter but nulls an out-of-range score', () => {
    expect(decodeTestOutcomes('p101', 1)).toEqual([
      { outcome: 'pass', score: null, saved: true },
    ]);
    expect(decodeTestOutcomes('f999', 1)).toEqual([
      { outcome: 'fail', score: null, saved: true },
    ]);
  });

  it('does not crash on a completely empty token between commas', () => {
    expect(decodeTestOutcomes('p85,,f40', 3)).toEqual([
      { outcome: 'pass', score: 85, saved: true },
      null,
      { outcome: 'fail', score: 40, saved: true },
    ]);
  });

  it('decodes a stray "!" in the wrong position as null rather than throwing', () => {
    expect(decodeTestOutcomes('p!85', 1)).toEqual([null]);
    expect(decodeTestOutcomes('!', 1)).toEqual([null]);
    expect(decodeTestOutcomes('x!', 1)).toEqual([null]);
  });
});

describe('setTestOutcomeAt', () => {
  it('sets an index on an empty/undefined encoded string', () => {
    expect(
      setTestOutcomeAt(undefined, 0, { outcome: 'pass', score: 100, saved: true }, 1)
    ).toBe('p100');
    expect(
      setTestOutcomeAt('', 2, { outcome: 'fail', score: 50, saved: true }, 3)
    ).toBe(',,f50');
  });

  it('preserves other indexes while updating one', () => {
    const initial = encodeTestOutcomes([
      { outcome: 'pass', score: 100, saved: true },
      null,
      { outcome: 'skipped', score: null, saved: true },
    ]);
    const updated = setTestOutcomeAt(
      initial,
      1,
      { outcome: 'fail', score: 20, saved: true },
      3
    );
    expect(decodeTestOutcomes(updated, 3)).toEqual([
      { outcome: 'pass', score: 100, saved: true },
      { outcome: 'fail', score: 20, saved: true },
      { outcome: 'skipped', score: null, saved: true },
    ]);
  });

  it('overwrites an already-set index', () => {
    const initial = encodeTestOutcomes([{ outcome: 'fail', score: 10, saved: true }]);
    const updated = setTestOutcomeAt(
      initial,
      0,
      { outcome: 'pass', score: 100, saved: true },
      1
    );
    expect(decodeTestOutcomes(updated, 1)).toEqual([
      { outcome: 'pass', score: 100, saved: true },
    ]);
  });
});

describe('summarizeTestOutcomes', () => {
  it('summarizes the empty case', () => {
    expect(summarizeTestOutcomes([])).toEqual({
      tested: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      unsaved: 0,
      accuracy: null,
      averageScore: null,
    });
  });

  it('treats an all-null (nothing reached) list the same as empty', () => {
    expect(summarizeTestOutcomes([null, null])).toEqual({
      tested: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      unsaved: 0,
      accuracy: null,
      averageScore: null,
    });
  });

  it('counts tested as pass + fail only, not skipped or null', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 100, saved: true },
      { outcome: 'fail', score: 0, saved: true },
      { outcome: 'skipped', score: null, saved: true },
      null,
    ];
    const summary = summarizeTestOutcomes(outcomes);
    expect(summary.tested).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);
  });

  it('computes accuracy as passed/tested rounded to an integer percentage', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 100, saved: true },
      { outcome: 'pass', score: 90, saved: true },
      { outcome: 'fail', score: 40, saved: true },
    ];
    expect(summarizeTestOutcomes(outcomes).accuracy).toBe(67); // 2/3 -> 67
  });

  it('computes averageScore as the rounded mean of non-null scores', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 90, saved: true },
      { outcome: 'fail', score: 41, saved: true },
    ];
    expect(summarizeTestOutcomes(outcomes).averageScore).toBe(66); // (90+41)/2 = 65.5 -> 66
  });

  it('excludes null scores (gave up) from averageScore but still counts them as tested', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: null, saved: true }, // gave up
      { outcome: 'pass', score: 80, saved: true },
    ];
    const summary = summarizeTestOutcomes(outcomes);
    expect(summary.tested).toBe(2);
    expect(summary.averageScore).toBe(80);
  });

  it('leaves averageScore null when every scored entry gave up', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: null, saved: true },
    ];
    expect(summarizeTestOutcomes(outcomes).averageScore).toBeNull();
  });

  it('excludes unsaved graded verses from tested/passed/failed and counts them in unsaved', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 90, saved: false },
      { outcome: 'fail', score: 30, saved: false },
      { outcome: 'pass', score: 100, saved: true },
    ];
    const summary = summarizeTestOutcomes(outcomes);
    expect(summary.unsaved).toBe(2);
    expect(summary.tested).toBe(1);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it('computes accuracy from saved results only', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: 20, saved: false },
      { outcome: 'pass', score: 90, saved: true },
    ];
    expect(summarizeTestOutcomes(outcomes).accuracy).toBe(100);
  });

  it('leaves accuracy null when every graded result was unsaved', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 90, saved: false },
      { outcome: 'fail', score: 10, saved: false },
    ];
    const summary = summarizeTestOutcomes(outcomes);
    expect(summary.tested).toBe(0);
    expect(summary.accuracy).toBeNull();
  });

  it('ignores unsaved entries scores in averageScore', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 0, saved: false },
      { outcome: 'pass', score: 100, saved: true },
    ];
    expect(summarizeTestOutcomes(outcomes).averageScore).toBe(100);
  });
});
