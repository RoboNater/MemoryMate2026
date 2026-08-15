/**
 * Encoding for a multi-verse Test session's results.
 *
 * Practice sessions don't need to remember anything as they move between
 * verses -- there is nothing to grade. A test session does: each verse gets
 * a pass/fail (and a score) that the summary screen has to add up at the
 * end. That state has to survive from `test/session?index=0` all the way to
 * `test/session?index=N-1` and then to `test/summary`.
 *
 * Rather than adding a store-backed "current session" concept, the results
 * travel in the URL query string, the same way `ids`, `index` and (for
 * Practice) `mode` already do. That keeps the session a pure function of its
 * route: back/forward navigation, refreshing the tab on web, and deep-linking
 * into the middle of a session all behave correctly for free, because the
 * URL *is* the state. The cost is that this module has to treat the encoded
 * string as adversarial input -- it arrives from `useLocalSearchParams`,
 * which means a user can edit it, an old bookmark can point at a shorter
 * session, or a share link can be mangled -- so decoding never throws and
 * always produces something the screen can render.
 */

export type TestOutcome = 'pass' | 'fail' | 'skipped';

export interface VerseTestOutcome {
  outcome: TestOutcome;
  /** Word-match percentage 0-100, or null when not scored (gave up / skipped). */
  score: number | null;
}

const OUTCOME_LETTERS: Record<TestOutcome, string> = {
  pass: 'p',
  fail: 'f',
  skipped: 's',
};

const LETTER_OUTCOMES: Record<string, TestOutcome> = {
  p: 'pass',
  f: 'fail',
  s: 'skipped',
};

/**
 * Encode one token per session index: the outcome letter optionally followed
 * by an integer score (`p85`, `f40`, `s`), or the empty string for a verse
 * not yet reached. Comma-separated so the whole thing drops into a query
 * string alongside `ids` the same way `mode` does.
 */
export function encodeTestOutcomes(outcomes: (VerseTestOutcome | null)[]): string {
  return outcomes
    .map((entry) => {
      if (!entry) return '';
      const letter = OUTCOME_LETTERS[entry.outcome];
      const score =
        entry.score !== null && Number.isInteger(entry.score) && entry.score >= 0 && entry.score <= 100
          ? String(entry.score)
          : '';
      return `${letter}${score}`;
    })
    .join(',');
}

/**
 * Decode back to exactly `length` entries, padding with `null` for anything
 * missing and dropping anything past `length`. Garbage tokens (an edited
 * URL, a session shortened between visits) decode to `null` rather than
 * throwing -- a blank verse card beats a crashed screen.
 */
export function decodeTestOutcomes(
  encoded: string | undefined,
  length: number
): (VerseTestOutcome | null)[] {
  const tokens = encoded ? encoded.split(',') : [];
  const result: (VerseTestOutcome | null)[] = [];

  for (let i = 0; i < length; i++) {
    result.push(parseToken(tokens[i]));
  }

  return result;
}

function parseToken(token: string | undefined): VerseTestOutcome | null {
  if (!token) return null;

  const match = /^([pfs])(\d*)$/.exec(token);
  if (!match) return null;

  const outcome = LETTER_OUTCOMES[match[1]];
  const scoreText = match[2];
  if (scoreText === '') {
    return { outcome, score: null };
  }

  const parsedScore = Number(scoreText);
  const score = parsedScore >= 0 && parsedScore <= 100 ? parsedScore : null;
  return { outcome, score };
}

/**
 * Decode, set one index, and re-encode -- the read-modify-write a session
 * screen does on every "Next".
 */
export function setTestOutcomeAt(
  encoded: string | undefined,
  index: number,
  outcome: VerseTestOutcome,
  length: number
): string {
  const outcomes = decodeTestOutcomes(encoded, length);
  outcomes[index] = outcome;
  return encodeTestOutcomes(outcomes);
}

export interface TestSessionSummary {
  tested: number;
  passed: number;
  failed: number;
  skipped: number;
  /** passed/tested as a 0-100 integer percentage, or null when nothing was tested. */
  accuracy: number | null;
  /** Rounded mean of the non-null scores, or null when there are none. */
  averageScore: number | null;
}

/** Aggregate a decoded outcome list for the summary screen. */
export function summarizeTestOutcomes(
  outcomes: (VerseTestOutcome | null)[]
): TestSessionSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const scores: number[] = [];

  for (const entry of outcomes) {
    if (!entry) continue;
    if (entry.outcome === 'pass') passed++;
    else if (entry.outcome === 'fail') failed++;
    else if (entry.outcome === 'skipped') skipped++;

    if (entry.score !== null) scores.push(entry.score);
  }

  const tested = passed + failed;

  return {
    tested,
    passed,
    failed,
    skipped,
    accuracy: tested > 0 ? Math.round((passed / tested) * 100) : null,
    averageScore:
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
  };
}
