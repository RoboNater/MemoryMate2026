import { calculateScore } from '../scoring';

describe('calculateScore', () => {
  it('scores identical text as 100%', () => {
    const text = 'For God so loved the world';
    expect(calculateScore(text, text)).toEqual({ matches: 6, total: 6, percentage: 100 });
  });

  it('scores completely wrong text as 0%', () => {
    expect(calculateScore('one two three', 'xxx yyy zzz')).toEqual({
      matches: 0,
      total: 3,
      percentage: 0,
    });
  });

  it('handles empty correct text (n === 0) without dividing by zero', () => {
    const result = calculateScore('', 'some words here');
    expect(result).toEqual({ matches: 0, total: 0, percentage: 0 });
    expect(Number.isNaN(result.percentage)).toBe(false);
  });

  it('handles empty user input', () => {
    expect(calculateScore('one two three', '')).toEqual({ matches: 0, total: 3, percentage: 0 });
  });

  it('is case-insensitive', () => {
    expect(calculateScore('Hello World', 'HELLO WORLD')).toEqual({
      matches: 2,
      total: 2,
      percentage: 100,
    });
  });

  it('collapses extra/irregular whitespace and newlines', () => {
    const correct = 'Hello\n\nWorld   Foo\tBar';
    const user = '  Hello\nWorld Foo\n\tBar  ';
    expect(calculateScore(correct, user)).toEqual({ matches: 4, total: 4, percentage: 100 });
  });

  describe('LCS vs. positional comparison (the reason LCS is used)', () => {
    it('a single OMITTED word near the start does not cascade the rest to wrong', () => {
      const correct = 'one two three four five six seven eight nine ten';
      const user = 'one three four five six seven eight nine ten'; // "two" omitted
      const result = calculateScore(correct, user);
      expect(result).toEqual({ matches: 9, total: 10, percentage: 90 });

      // Contrast with a naive positional (index-by-index) comparison, which
      // is exactly the cascading failure LCS avoids: once "two" is missing,
      // every later word shifts out of alignment.
      const correctWords = correct.split(' ');
      const userWords = user.split(' ');
      const positionalMatches = correctWords.filter((w, i) => w === userWords[i]).length;
      expect(positionalMatches).toBe(1);
    });

    it('a single INSERTED word near the start does not cascade the rest to wrong', () => {
      const correct = 'one two three four five six seven eight nine ten';
      const user = 'zero one two three four five six seven eight nine ten'; // "zero" inserted
      const result = calculateScore(correct, user);
      expect(result.matches).toBe(10);
      expect(result.total).toBe(10);

      const correctWords = correct.split(' ');
      const userWords = user.split(' ');
      const positionalMatches = correctWords.filter((w, i) => w === userWords[i]).length;
      expect(positionalMatches).toBe(0);
    });
  });

  // CHARACTERIZATION, NOT SPECIFICATION -- see issue #23.
  //
  // `total` is the *correct* verse's word count, so words the user adds are
  // never counted against them: a correct verse plus arbitrary extra text still
  // scores 100%. These tests exist to make that behavior visible and to catch it
  // changing silently. They are NOT an assertion that it is the desired product
  // semantic, and they should be rewritten (not deleted) if #23 decides
  // insertions ought to cost something.
  describe('insertions are not penalized [characterization]', () => {
    const verse = 'For God so loved the world';

    it('trailing junk after a perfect answer still scores 100%', () => {
      expect(calculateScore(verse, `${verse} and then some nonsense`).percentage).toBe(100);
    });

    it('the whole verse typed twice still scores 100%', () => {
      expect(calculateScore(verse, `${verse} ${verse}`).percentage).toBe(100);
    });
  });

  it('scores reordered words by longest common subsequence, not set membership', () => {
    expect(calculateScore('apple banana cherry', 'cherry apple banana')).toEqual({
      matches: 2,
      total: 3,
      percentage: 67,
    });
  });

  it('handles repeated words without over- or under-counting', () => {
    expect(calculateScore('a b a', 'a a b')).toEqual({ matches: 2, total: 3, percentage: 67 });
  });

  describe('percentage rounding', () => {
    it.each([
      ['alpha beta gamma', 'alpha xxxx yyyy', 1, 3, 33], // 1/3 -> 33
      ['one two three four five six', 'one two three four five xxxx', 5, 6, 83], // 5/6 -> 83
      ['one two three', 'one xxxx three', 2, 3, 67], // 2/3 -> 67
    ])('%s vs %s -> %i/%i (%i%%)', (correct, user, matches, total, percentage) => {
      expect(calculateScore(correct, user)).toEqual({ matches, total, percentage });
    });
  });
});
