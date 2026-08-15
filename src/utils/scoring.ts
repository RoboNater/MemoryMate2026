/**
 * Scoring for the graded recall modes.
 *
 * Two modes live here and they align their input differently on purpose:
 *
 * - Full recall (`calculateScore`) takes free-typed prose. Nothing in that
 *   input says which typed word was *meant* to be which verse word, so the
 *   alignment has to be recovered — hence LCS.
 * - First-letter (`calculateFirstLetterScore`) takes exactly one token per
 *   verse word. The alignment is given by the input format, so it is compared
 *   positionally; running LCS on top of a known alignment would discard that
 *   information and score unrelated answers far too well.
 *
 * The rule, for the modes still to come (see issue #18): recover alignment
 * only when the input format destroyed it. See
 * `docs/notes/scoring-modes.md`.
 */

/**
 * Score the result of "type the verse from memory" against the verse's known
 * text.
 */
export interface ScoreResult {
  matches: number;
  total: number;
  percentage: number;
}

// Word matching for scoring.
//
// We align the two word sequences with a longest-common-subsequence (LCS)
// count rather than comparing position-by-position. A positional compare
// cascades: omit or add a single word and every following word shifts out of
// alignment, so all of them read as wrong. LCS counts the words that match
// in order regardless of insertions/deletions, which is what a human grader
// would consider "correct".
export function calculateScore(correctText: string, userText: string): ScoreResult {
  const correctWords = correctText.toLowerCase().split(/\s+/).filter(Boolean);
  const userWords = userText.toLowerCase().split(/\s+/).filter(Boolean);

  // Classic LCS-length DP over the two word sequences.
  const n = correctWords.length;
  const m = userWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        correctWords[i - 1] === userWords[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matches = dp[n][m];

  return {
    matches,
    total: n,
    percentage: n > 0 ? Math.round((matches / n) * 100) : 0,
  };
}

// --- First-letter practice mode (issue #29) -------------------------------

/** One verse word's worth of the first-letter exercise. */
export interface FirstLetterSlot {
  /** The verse word's first letter, lowercased. */
  expected: string;
  /** What the user typed in this position, or null if they stopped short. */
  typed: string | null;
  correct: boolean;
}

export interface FirstLetterScoreResult extends ScoreResult {
  slots: FirstLetterSlot[];
  /**
   * Tokens typed beyond the end of the verse. These leave `matches` and
   * `total` alone but are charged to `percentage`, so overshooting costs
   * something -- see `calculateFirstLetterScore`.
   */
  extra: number;
}

// A "word" is whatever `calculateScore` would treat as one: a run of
// non-whitespace. Keeping the two definitions identical matters more than a
// cleverer tokenizer would -- it is also the count already shown on the
// practice screens (`verse.text.split(' ').length`). So `loving-kindness` is
// one word and asks for one letter, which the on-screen slots make visible
// rather than something the user has to guess.
const WORD_SEPARATOR = /\s+/;

// The first letter *or digit*, so "40 days" asks for "4 d". Leading
// punctuation is skipped ('"For' -> "f") and a word with no alphanumeric
// character at all (a stray em dash) drops out of the sequence entirely rather
// than demanding a keystroke nobody would guess.
const ALPHANUMERIC = /[\p{L}\p{N}]/u;

/**
 * The expected answer for a verse: one lowercased first letter per word.
 */
export function firstLetterTokens(text: string): string[] {
  return text
    .split(WORD_SEPARATOR)
    .map((word) => word.match(ALPHANUMERIC)?.[0].toLowerCase() ?? '')
    .filter(Boolean);
}

/**
 * What the user typed, as a token sequence.
 *
 * Everything that isn't a letter or digit is discarded, so "fgsltw",
 * "f g s l t w" and "f,g,s,l,t,w" are the same answer -- requiring separators
 * on a phone keyboard would cost the user something and buy nothing.
 */
export function parseFirstLetterInput(input: string): string[] {
  return Array.from(input.toLowerCase()).filter((char) => ALPHANUMERIC.test(char));
}

/**
 * Score a first-letter attempt positionally.
 *
 * One typed token lines up with one verse word by construction, so position
 * *is* the alignment -- see the note at the top of this file for why this
 * deliberately does not reuse the LCS in `calculateScore`.
 *
 * A dropped token therefore cascades: every later slot reads as wrong. That is
 * accepted, and is why the UI shows the slots. The cascade is legible on
 * screen ("everything from here is red") in a way a bare score would not be.
 *
 * Tokens typed past the end of the verse are penalized, unlike the insertions
 * `calculateScore` ignores (#23). That is not the same open question: there,
 * free prose makes an insertion ambiguous -- synonym, typo, restart -- so the
 * penalty is undefined. Here the slot count is on screen before the user
 * types, so an extra token is unambiguously a mistake against a rule they
 * could see. Leaving it free would also be asymmetric: typing too *few*
 * letters is already punished by the unfilled slots.
 */
export function calculateFirstLetterScore(
  correctText: string,
  userInput: string
): FirstLetterScoreResult {
  const expected = firstLetterTokens(correctText);
  const typed = parseFirstLetterInput(userInput);

  const slots: FirstLetterSlot[] = expected.map((letter, i) => {
    const typedLetter = i < typed.length ? typed[i] : null;
    return {
      expected: letter,
      typed: typedLetter,
      correct: typedLetter === letter,
    };
  });

  const matches = slots.filter((slot) => slot.correct).length;
  const total = expected.length;
  const extra = Math.max(0, typed.length - total);

  // `total` stays the verse's word count -- it is what the slot row renders
  // and what "N of M words" means. Extras are charged to the denominator only,
  // so a perfect answer with three stray letters reads "6 of 6 words, 3 extra,
  // 67%" rather than silently scoring 100%.
  const denominator = total + extra;

  return {
    matches,
    total,
    percentage: denominator > 0 ? Math.round((matches / denominator) * 100) : 0,
    slots,
    extra,
  };
}
