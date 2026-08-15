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
