/**
 * Guided first-letter practice: the interaction, as a pure reducer (issue #44).
 *
 * One slot per verse word, a cursor on one slot, one keystroke per word. The
 * cursor is the whole design: a wrong letter never advances it, and after the
 * second miss the app advances it deliberately, so there is no sequence of
 * keystrokes that leaves the user out of step with the verse.
 *
 * That is why `src/utils/scoring.ts`'s positional-cascade problem does not
 * appear here -- alignment is enforced by the interaction rather than recovered
 * by the scorer. See `docs/notes/practice-interaction.md` for the reasoning and
 * for the strategies that were considered and deferred.
 *
 * No React and no I/O, so every rule below is testable as data.
 */

import { firstLetterWords, isAnswerCharacter } from './scoring';

/**
 * What became of one word.
 *
 * `recovered` is deliberately distinct from `correct`: separating "I knew it"
 * from "I got there" from "I had no idea" is the practice signal a single
 * percentage cannot carry.
 */
export type SlotStatus = 'pending' | 'correct' | 'recovered' | 'missed' | 'skipped';

export interface GuidedSlot {
  /** The verse word as written, punctuation and all. */
  word: string;
  /** The letter this slot asks for, lowercased. */
  letter: string;
  /** Shown in full from the start, as a memory aid. Still asks for the letter. */
  visible: boolean;
  status: SlotStatus;
  /**
   * The user's first wrong letter on this slot, kept for display under the
   * word. A second wrong letter reveals the word, so it is not recorded -- the
   * first instinct is the informative one.
   */
  wrongLetter: string | null;
}

/** What just happened, for the UI to colour and announce. */
export interface GuidedFeedback {
  kind: 'correct' | 'wrong' | 'revealed' | 'skipped';
  slot: number;
}

export interface GuidedState {
  slots: GuidedSlot[];
  /** The active slot. Equals `slots.length` once the exercise is finished. */
  cursor: number;
  /** Wrong attempts spent on the active slot: 0 or 1. */
  attempts: number;
  /**
   * Bumped on every state-changing event. The UI keys its feedback effect on
   * this rather than on `lastFeedback`, so two wrong letters in a row still
   * fire twice.
   */
  seq: number;
  lastFeedback: GuidedFeedback | null;
}

export type GuidedEvent =
  | { type: 'letter'; value: string }
  | { type: 'skip' };

export interface GuidedTally {
  correct: number;
  recovered: number;
  missed: number;
  skipped: number;
  total: number;
}

// --- The visible-word mask ------------------------------------------------

/**
 * The fraction of words shown in full. Difficulty is this one number: all
 * shown is a rhythm walkthrough, none shown is the original exercise but
 * guided. Two thirds is the "easy" end, and it is a constant rather than a
 * user control until someone has practised with it -- see #47.
 */
export const DEFAULT_SHOWN_FRACTION = 2 / 3;

/**
 * The longest run of blanks allowed. Without a cap, "easy" can still hand you
 * six unknowns in a row, which is exactly what the setting is meant to avoid.
 */
export const MAX_CONSECUTIVE_HIDDEN = 3;

export interface MaskOptions {
  shownFraction?: number;
  maxConsecutiveHidden?: number;
}

// xmur3 -- a string to one well-mixed 32-bit seed.
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// mulberry32 -- small, fast, and good enough to shuffle word indices.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which words are shown in full, deterministically, seeded from the verse id.
 *
 * Deterministic rather than random per attempt: the same words are blank each
 * time you practise a verse, so it does not feel like a different exercise
 * every run, it needs no stored state, and it is cheap to test. The strategies
 * that lost -- random, content-word-aware, and adaptive from past misses -- are
 * recorded in `docs/notes/practice-interaction.md`; adaptive is the one worth
 * revisiting, and it waits on the data model in #31.
 *
 * Two rules override the fraction, both on purpose:
 *   - the first word is always shown, so there is somewhere to start
 *   - no more than `maxConsecutiveHidden` blanks in a row
 *
 * Either can push the realised fraction above the target. That is accepted:
 * the target is a dial, not a contract.
 */
export function visibleWordMask(
  count: number,
  seed: string,
  options: MaskOptions = {}
): boolean[] {
  if (count <= 0) return [];

  const shownFraction = Math.min(
    1,
    Math.max(0, options.shownFraction ?? DEFAULT_SHOWN_FRACTION)
  );
  const maxConsecutiveHidden = options.maxConsecutiveHidden ?? MAX_CONSECUTIVE_HIDDEN;

  const mask = new Array<boolean>(count).fill(false);
  mask[0] = true;

  // Seeded Fisher-Yates over the remaining indices, then take as many as the
  // target asks for. Shuffling rather than sampling keeps the choice uniform
  // and the result a pure function of the seed.
  const rest: number[] = [];
  for (let i = 1; i < count; i++) rest.push(i);

  const random = mulberry32(hashSeed(seed));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = rest[i];
    rest[i] = rest[j];
    rest[j] = swap;
  }

  const target = Math.round(count * shownFraction);
  for (let k = 0; k < rest.length && k < target - 1; k++) {
    mask[rest[k]] = true;
  }

  // Break up any run longer than the cap by showing the word that would have
  // exceeded it. Deterministic, and leaves runs of exactly the cap intact.
  let run = 0;
  for (let i = 0; i < count; i++) {
    if (mask[i]) {
      run = 0;
      continue;
    }
    run += 1;
    if (run > maxConsecutiveHidden) {
      mask[i] = true;
      run = 0;
    }
  }

  return mask;
}

// --- The reducer ----------------------------------------------------------

export interface GuidedInit extends MaskOptions {
  verseText: string;
  /** Seeds the mask, so a verse blanks the same words every time. */
  verseId: string;
}

export function createGuidedState(init: GuidedInit): GuidedState {
  const words = firstLetterWords(init.verseText);
  const mask = visibleWordMask(words.length, init.verseId, {
    shownFraction: init.shownFraction,
    maxConsecutiveHidden: init.maxConsecutiveHidden,
  });

  return {
    slots: words.map((entry, index) => ({
      word: entry.word,
      letter: entry.letter,
      visible: mask[index],
      status: 'pending',
      wrongLetter: null,
    })),
    cursor: 0,
    attempts: 0,
    seq: 0,
    lastFeedback: null,
  };
}

export function isComplete(state: GuidedState): boolean {
  return state.cursor >= state.slots.length;
}

// Settle the active slot and move on.
function advance(
  state: GuidedState,
  status: Exclude<SlotStatus, 'pending'>,
  kind: GuidedFeedback['kind']
): GuidedState {
  const index = state.cursor;
  const slots = state.slots.slice();
  slots[index] = { ...slots[index], status };

  return {
    slots,
    cursor: index + 1,
    attempts: 0,
    seq: state.seq + 1,
    lastFeedback: { kind, slot: index },
  };
}

/**
 * The whole interaction:
 *
 *   correct letter            -> the word fills in, cursor advances
 *   first wrong letter        -> flagged, cursor holds for one more attempt
 *   second wrong letter       -> the word is revealed, marked missed, advances
 *   skip (space or button)    -> the word is revealed, marked skipped, advances
 *
 * A keystroke that is not a possible answer -- punctuation, a stray symbol --
 * is ignored outright and does *not* consume the one retry.
 */
export function guidedReducer(state: GuidedState, event: GuidedEvent): GuidedState {
  if (isComplete(state)) return state;

  if (event.type === 'skip') {
    return advance(state, 'skipped', 'skipped');
  }

  const typed = event.value.toLowerCase();
  if (typed.length !== 1 || !isAnswerCharacter(typed)) return state;

  const slot = state.slots[state.cursor];

  if (typed === slot.letter) {
    return advance(state, state.attempts === 0 ? 'correct' : 'recovered', 'correct');
  }

  if (state.attempts === 0) {
    // Hold. This is the line that makes losing alignment impossible.
    const slots = state.slots.slice();
    slots[state.cursor] = { ...slot, wrongLetter: typed };
    return {
      slots,
      cursor: state.cursor,
      attempts: 1,
      seq: state.seq + 1,
      lastFeedback: { kind: 'wrong', slot: state.cursor },
    };
  }

  return advance(state, 'missed', 'revealed');
}

/**
 * The per-word tally that replaces a percentage.
 *
 * Every guided run ends with every word filled in, so "what percentage did you
 * get" stops being a meaningful question. Displayed, not stored -- persisting
 * it needs a data model, which is #31.
 */
export function guidedTally(state: GuidedState): GuidedTally {
  const tally: GuidedTally = {
    correct: 0,
    recovered: 0,
    missed: 0,
    skipped: 0,
    total: state.slots.length,
  };

  for (const slot of state.slots) {
    if (slot.status !== 'pending') {
      tally[slot.status] += 1;
    }
  }

  return tally;
}
