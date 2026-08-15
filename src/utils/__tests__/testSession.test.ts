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
      { outcome: 'pass', score: 85 },
      null, // not reached yet
      { outcome: 'fail', score: 40 },
      { outcome: 'skipped', score: null },
    ];

    const encoded = encodeTestOutcomes(outcomes);
    expect(decodeTestOutcomes(encoded, outcomes.length)).toEqual(outcomes);
  });

  it('round-trips an outcome with no score (gave up)', () => {
    const outcomes: (VerseTestOutcome | null)[] = [{ outcome: 'fail', score: null }];
    const encoded = encodeTestOutcomes(outcomes);
    expect(encoded).toBe('f');
    expect(decodeTestOutcomes(encoded, 1)).toEqual(outcomes);
  });

  it('encodes pass/fail scores as the letter followed by the integer', () => {
    expect(encodeTestOutcomes([{ outcome: 'pass', score: 85 }])).toBe('p85');
    expect(encodeTestOutcomes([{ outcome: 'fail', score: 40 }])).toBe('f40');
  });

  it('encodes skipped entries as a bare "s"', () => {
    expect(encodeTestOutcomes([{ outcome: 'skipped', score: null }])).toBe('s');
  });

  it('encodes an unreached verse (null) as an empty token', () => {
    expect(encodeTestOutcomes([null, null])).toBe(',');
  });

  it('round-trips a score of exactly 0 and 100', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: 0 },
      { outcome: 'pass', score: 100 },
    ];
    expect(decodeTestOutcomes(encodeTestOutcomes(outcomes), 2)).toEqual(outcomes);
  });
});

describe('decodeTestOutcomes padding and truncation', () => {
  it('pads with null when the encoded string is shorter than length', () => {
    const encoded = encodeTestOutcomes([{ outcome: 'pass', score: 100 }]);
    expect(decodeTestOutcomes(encoded, 4)).toEqual([
      { outcome: 'pass', score: 100 },
      null,
      null,
      null,
    ]);
  });

  it('ignores tokens past length rather than including them', () => {
    const encoded = encodeTestOutcomes([
      { outcome: 'pass', score: 100 },
      { outcome: 'fail', score: 0 },
      { outcome: 'skipped', score: null },
    ]);
    expect(decodeTestOutcomes(encoded, 1)).toEqual([{ outcome: 'pass', score: 100 }]);
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
    expect(decodeTestOutcomes('p101', 1)).toEqual([{ outcome: 'pass', score: null }]);
    expect(decodeTestOutcomes('f999', 1)).toEqual([{ outcome: 'fail', score: null }]);
  });

  it('does not crash on a completely empty token between commas', () => {
    expect(decodeTestOutcomes('p85,,f40', 3)).toEqual([
      { outcome: 'pass', score: 85 },
      null,
      { outcome: 'fail', score: 40 },
    ]);
  });
});

describe('setTestOutcomeAt', () => {
  it('sets an index on an empty/undefined encoded string', () => {
    expect(setTestOutcomeAt(undefined, 0, { outcome: 'pass', score: 100 }, 1)).toBe('p100');
    expect(setTestOutcomeAt('', 2, { outcome: 'fail', score: 50 }, 3)).toBe(',,f50');
  });

  it('preserves other indexes while updating one', () => {
    const initial = encodeTestOutcomes([
      { outcome: 'pass', score: 100 },
      null,
      { outcome: 'skipped', score: null },
    ]);
    const updated = setTestOutcomeAt(initial, 1, { outcome: 'fail', score: 20 }, 3);
    expect(decodeTestOutcomes(updated, 3)).toEqual([
      { outcome: 'pass', score: 100 },
      { outcome: 'fail', score: 20 },
      { outcome: 'skipped', score: null },
    ]);
  });

  it('overwrites an already-set index', () => {
    const initial = encodeTestOutcomes([{ outcome: 'fail', score: 10 }]);
    const updated = setTestOutcomeAt(initial, 0, { outcome: 'pass', score: 100 }, 1);
    expect(decodeTestOutcomes(updated, 1)).toEqual([{ outcome: 'pass', score: 100 }]);
  });
});

describe('summarizeTestOutcomes', () => {
  it('summarizes the empty case', () => {
    expect(summarizeTestOutcomes([])).toEqual({
      tested: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
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
      accuracy: null,
      averageScore: null,
    });
  });

  it('counts tested as pass + fail only, not skipped or null', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 100 },
      { outcome: 'fail', score: 0 },
      { outcome: 'skipped', score: null },
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
      { outcome: 'pass', score: 100 },
      { outcome: 'pass', score: 90 },
      { outcome: 'fail', score: 40 },
    ];
    expect(summarizeTestOutcomes(outcomes).accuracy).toBe(67); // 2/3 -> 67
  });

  it('computes averageScore as the rounded mean of non-null scores', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'pass', score: 90 },
      { outcome: 'fail', score: 41 },
    ];
    expect(summarizeTestOutcomes(outcomes).averageScore).toBe(66); // (90+41)/2 = 65.5 -> 66
  });

  it('excludes null scores (gave up) from averageScore but still counts them as tested', () => {
    const outcomes: (VerseTestOutcome | null)[] = [
      { outcome: 'fail', score: null }, // gave up
      { outcome: 'pass', score: 80 },
    ];
    const summary = summarizeTestOutcomes(outcomes);
    expect(summary.tested).toBe(2);
    expect(summary.averageScore).toBe(80);
  });

  it('leaves averageScore null when every scored entry gave up', () => {
    const outcomes: (VerseTestOutcome | null)[] = [{ outcome: 'fail', score: null }];
    expect(summarizeTestOutcomes(outcomes).averageScore).toBeNull();
  });
});
