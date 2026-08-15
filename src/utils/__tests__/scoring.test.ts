import {
  calculateFirstLetterScore,
  calculateScore,
  firstLetterTokens,
  parseFirstLetterInput,
} from '../scoring';

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

describe('firstLetterTokens', () => {
  it('takes one lowercased first letter per whitespace-separated word', () => {
    expect(firstLetterTokens('For God so loved the world')).toEqual([
      'f',
      'g',
      's',
      'l',
      't',
      'w',
    ]);
  });

  it('skips leading punctuation', () => {
    expect(firstLetterTokens('"For (God) ‘so’')).toEqual(['f', 'g', 's']);
  });

  it('takes the letter before an apostrophe in a possessive', () => {
    expect(firstLetterTokens("God's own Son")).toEqual(['g', 'o', 's']);
  });

  it('treats a hyphenate as one word asking for one letter', () => {
    expect(firstLetterTokens('his loving-kindness endures')).toEqual(['h', 'l', 'e']);
  });

  it('keeps digits as tokens', () => {
    expect(firstLetterTokens('forty 40 days')).toEqual(['f', '4', 'd']);
  });

  it('drops a word with no alphanumeric character rather than demanding a keystroke', () => {
    expect(firstLetterTokens('the LORD — my shepherd')).toEqual(['t', 'l', 'm', 's']);
  });

  it('collapses irregular whitespace the same way calculateScore does', () => {
    expect(firstLetterTokens('  For\n\nGod   so\tloved ')).toEqual(['f', 'g', 's', 'l']);
  });

  it('returns nothing for empty text', () => {
    expect(firstLetterTokens('')).toEqual([]);
    expect(firstLetterTokens('   ')).toEqual([]);
  });
});

describe('parseFirstLetterInput', () => {
  it('accepts a run-together answer', () => {
    expect(parseFirstLetterInput('fgsltw')).toEqual(['f', 'g', 's', 'l', 't', 'w']);
  });

  it('accepts the same answer with any separators, so both are one answer', () => {
    const expected = ['f', 'g', 's', 'l', 't', 'w'];
    expect(parseFirstLetterInput('f g s l t w')).toEqual(expected);
    expect(parseFirstLetterInput('f,g,s,l,t,w')).toEqual(expected);
    expect(parseFirstLetterInput('  F G S L T W  ')).toEqual(expected);
  });

  it('keeps digits and drops everything else', () => {
    expect(parseFirstLetterInput('f4d!?')).toEqual(['f', '4', 'd']);
  });
});

describe('calculateFirstLetterScore', () => {
  const verse = 'For God so loved the world';

  it('scores a perfect answer as 100%', () => {
    const result = calculateFirstLetterScore(verse, 'fgsltw');
    expect(result.matches).toBe(6);
    expect(result.total).toBe(6);
    expect(result.percentage).toBe(100);
    expect(result.slots.every((slot) => slot.correct)).toBe(true);
  });

  it('reports each slot so the UI can show which words were right', () => {
    const result = calculateFirstLetterScore(verse, 'fgxltw');
    expect(result.slots.map((slot) => slot.correct)).toEqual([
      true,
      true,
      false,
      true,
      true,
      true,
    ]);
    expect(result.slots[2]).toEqual({ expected: 's', typed: 'x', correct: false });
    expect(result.percentage).toBe(83);
  });

  it('leaves unreached slots typed: null rather than blank-matching them', () => {
    const result = calculateFirstLetterScore(verse, 'fgs');
    expect(result.matches).toBe(3);
    expect(result.slots[3]).toEqual({ expected: 'l', typed: null, correct: false });
    expect(result.percentage).toBe(50);
  });

  it('handles empty input', () => {
    const result = calculateFirstLetterScore(verse, '');
    expect(result).toMatchObject({ matches: 0, total: 6, percentage: 0, extra: 0 });
  });

  it('handles empty verse text without dividing by zero', () => {
    const result = calculateFirstLetterScore('', 'fgs');
    expect(result).toMatchObject({ matches: 0, total: 0, percentage: 0, extra: 3 });
    expect(Number.isNaN(result.percentage)).toBe(false);
  });

  it('counts tokens typed past the end of the verse as extra, not as matches', () => {
    const result = calculateFirstLetterScore(verse, 'fgsltwxyz');
    expect(result).toMatchObject({ matches: 6, total: 6, percentage: 100, extra: 3 });
  });

  it('is case-insensitive on both sides', () => {
    expect(calculateFirstLetterScore('HELLO world', 'Hw').percentage).toBe(100);
  });

  describe('positional vs. LCS (the reason this does NOT reuse calculateScore)', () => {
    // The inverse of the LCS block above, and deliberately so. Full recall
    // takes free prose, where nothing says which typed word was meant to be
    // which verse word, so the alignment must be recovered -- LCS. Here the
    // user types exactly one token per word, so the input format *is* the
    // alignment. See docs/notes/scoring-modes.md.
    const john316 =
      'For God so loved the world, that he gave his only begotten Son, ' +
      'that whosoever believeth in him should not perish, but have everlasting life.';
    const garbage =
      'The quick brown fox jumped over a lazy dog while nobody was looking ' +
      'at the garden gate on a cold and rainy Tuesday morning in early spring';

    it('scores an unrelated answer at zero, where LCS would score it a third right', () => {
      // Someone confidently first-lettering the wrong text entirely.
      const wrongAnswer = firstLetterTokens(garbage).join('');

      expect(calculateFirstLetterScore(john316, wrongAnswer).percentage).toBe(0);

      // What reusing calculateScore over first letters would have done. Over a
      // 26-symbol alphabet with English's skewed first-letter distribution,
      // LCS finds long spurious subsequences between unrelated strings, so a
      // completely wrong answer reads as a third correct.
      const lcsOverFirstLetters = calculateScore(
        firstLetterTokens(john316).join(' '),
        Array.from(wrongAnswer).join(' ')
      );
      expect(lcsOverFirstLetters.percentage).toBe(36);
    });

    it('cascades after a dropped token, which is the accepted cost', () => {
      // "so" omitted: every later slot shifts and reads as wrong. The UI shows
      // the slots precisely so this is legible rather than mysterious.
      const result = calculateFirstLetterScore(verse, 'fgltw');
      expect(result.matches).toBe(2);
      expect(result.slots.map((slot) => slot.correct)).toEqual([
        true,
        true,
        false,
        false,
        false,
        false,
      ]);
    });
  });
});
