import {
  createGuidedState,
  guidedReducer,
  guidedTally,
  isComplete,
  visibleWordMask,
  DEFAULT_SHOWN_FRACTION,
  MAX_CONSECUTIVE_HIDDEN,
  type GuidedEvent,
  type GuidedState,
} from '../guidedFirstLetter';

const VERSE = 'For God so loved the world';
// f g s l t w

/** A state whose visible-word mask cannot affect the assertion under test. */
function start(text = VERSE): GuidedState {
  return createGuidedState({
    verseText: text,
    verseId: 'verse-1',
    maxConsecutiveHidden: Number.POSITIVE_INFINITY,
  });
}

function play(state: GuidedState, events: GuidedEvent[]): GuidedState {
  return events.reduce(guidedReducer, state);
}

/** Shorthand: type these characters, one per event. */
function type(state: GuidedState, letters: string): GuidedState {
  return play(
    state,
    Array.from(letters).map((value) => ({ type: 'letter', value }) as GuidedEvent)
  );
}

describe('createGuidedState', () => {
  it('makes one slot per word, carrying the word text and its letter', () => {
    const state = start();
    expect(state.slots).toHaveLength(6);
    expect(state.slots.map((s) => s.letter)).toEqual(['f', 'g', 's', 'l', 't', 'w']);
    expect(state.slots.map((s) => s.word)).toEqual([
      'For',
      'God',
      'so',
      'loved',
      'the',
      'world',
    ]);
    expect(state.cursor).toBe(0);
    expect(state.attempts).toBe(0);
    expect(state.slots.every((s) => s.status === 'pending')).toBe(true);
  });

  it('uses the same word rule as scoring, so a hyphenate is one slot', () => {
    const state = start('his loving-kindness endures');
    expect(state.slots.map((s) => s.letter)).toEqual(['h', 'l', 'e']);
  });

  it('drops a word with no letter or digit, which asks for no keystroke', () => {
    const state = start('wait — for it');
    expect(state.slots.map((s) => s.word)).toEqual(['wait', 'for', 'it']);
  });

  it('is finished immediately for a verse with no words', () => {
    const state = start('   ');
    expect(state.slots).toEqual([]);
    expect(isComplete(state)).toBe(true);
  });
});

describe('guidedReducer', () => {
  it('fills the word in and advances on a correct letter', () => {
    const state = type(start(), 'f');
    expect(state.slots[0].status).toBe('correct');
    expect(state.cursor).toBe(1);
    expect(state.attempts).toBe(0);
    expect(state.lastFeedback).toEqual({ kind: 'correct', slot: 0 });
  });

  it('accepts an uppercase letter', () => {
    expect(type(start(), 'F').slots[0].status).toBe('correct');
  });

  it('holds the cursor on the first wrong letter', () => {
    const state = type(start(), 'x');
    expect(state.cursor).toBe(0);
    expect(state.attempts).toBe(1);
    expect(state.slots[0].status).toBe('pending');
    expect(state.slots[0].wrongLetter).toBe('x');
    expect(state.lastFeedback).toEqual({ kind: 'wrong', slot: 0 });
  });

  it('marks the word recovered when the second attempt is right', () => {
    const state = type(start(), 'xf');
    expect(state.slots[0].status).toBe('recovered');
    expect(state.cursor).toBe(1);
    expect(state.attempts).toBe(0);
  });

  it('reveals the word and marks it missed after a second wrong letter', () => {
    const state = type(start(), 'xy');
    expect(state.slots[0].status).toBe('missed');
    expect(state.cursor).toBe(1);
    expect(state.attempts).toBe(0);
    expect(state.lastFeedback).toEqual({ kind: 'revealed', slot: 0 });
  });

  it('shows the first wrong letter, not the second, on a missed word', () => {
    expect(type(start(), 'xy').slots[0].wrongLetter).toBe('x');
  });

  it('skips the word on a skip event', () => {
    const state = guidedReducer(start(), { type: 'skip' });
    expect(state.slots[0].status).toBe('skipped');
    expect(state.cursor).toBe(1);
    expect(state.lastFeedback).toEqual({ kind: 'skipped', slot: 0 });
  });

  it('lets a skip end a word already flagged wrong', () => {
    const state = guidedReducer(type(start(), 'x'), { type: 'skip' });
    expect(state.slots[0].status).toBe('skipped');
    expect(state.slots[0].wrongLetter).toBe('x');
    expect(state.cursor).toBe(1);
  });

  it('ignores a punctuation keystroke without consuming the retry', () => {
    const before = start();
    const after = guidedReducer(before, { type: 'letter', value: ',' });
    // Same object: nothing changed, so the UI has nothing to re-render.
    expect(after).toBe(before);
    expect(type(after, 'xf').slots[0].status).toBe('recovered');
  });

  it('ignores a multi-character insertion', () => {
    // iOS reports an autocorrect replacement as the whole inserted string.
    const before = start();
    expect(guidedReducer(before, { type: 'letter', value: 'hello ' })).toBe(before);
  });

  it('matches a digit, so "40 days" asks for "4 d"', () => {
    const state = type(start('forty 40 days'), 'f4d');
    expect(state.slots.map((s) => s.status)).toEqual(['correct', 'correct', 'correct']);
    expect(isComplete(state)).toBe(true);
  });

  it('is a no-op once the exercise is finished', () => {
    const done = type(start(), 'fgsltw');
    expect(isComplete(done)).toBe(true);
    expect(guidedReducer(done, { type: 'letter', value: 'x' })).toBe(done);
    expect(guidedReducer(done, { type: 'skip' })).toBe(done);
  });

  it('bumps seq on every state-changing event, so two misses fire twice', () => {
    const first = type(start(), 'x');
    const second = type(first, 'y');
    expect(first.seq).toBe(1);
    expect(second.seq).toBe(2);
    expect(second.lastFeedback).not.toEqual(first.lastFeedback);
  });

  it('never advances past a word the user has not settled', () => {
    // Twelve wrong letters cannot get further than six words.
    const state = type(start(), 'zzzzzzzzzzzz');
    expect(state.cursor).toBe(6);
    expect(isComplete(state)).toBe(true);
  });
});

describe('guidedTally', () => {
  it('separates knew it, got there, had no idea, and gave up', () => {
    let state = start();
    state = type(state, 'f'); // correct
    state = type(state, 'xg'); // recovered
    state = type(state, 'xy'); // missed
    state = guidedReducer(state, { type: 'skip' }); // skipped
    state = type(state, 't'); // correct
    state = type(state, 'w'); // correct

    expect(guidedTally(state)).toEqual({
      correct: 3,
      recovered: 1,
      missed: 1,
      skipped: 1,
      total: 6,
    });
  });

  it('accounts for every word once the run is complete', () => {
    const state = type(start(), 'fgsltw');
    const tally = guidedTally(state);
    expect(tally.correct + tally.recovered + tally.missed + tally.skipped).toBe(
      tally.total
    );
  });

  it('counts nothing but the total before anything is typed', () => {
    expect(guidedTally(start())).toEqual({
      correct: 0,
      recovered: 0,
      missed: 0,
      skipped: 0,
      total: 6,
    });
  });
});

describe('visibleWordMask', () => {
  const LONG = 40;

  it('is the same every time for the same verse', () => {
    expect(visibleWordMask(LONG, 'verse-1')).toEqual(visibleWordMask(LONG, 'verse-1'));
  });

  it('differs between verses', () => {
    expect(visibleWordMask(LONG, 'verse-1')).not.toEqual(
      visibleWordMask(LONG, 'verse-2')
    );
  });

  it('always shows the first word, so there is somewhere to start', () => {
    for (const seed of ['a', 'b', 'c', 'verse-1']) {
      expect(visibleWordMask(LONG, seed, { shownFraction: 0 })[0]).toBe(true);
    }
  });

  it('never leaves more blanks in a row than the cap', () => {
    for (const seed of ['a', 'b', 'c', 'verse-1']) {
      const mask = visibleWordMask(LONG, seed, { shownFraction: 0 });
      let run = 0;
      for (const shown of mask) {
        run = shown ? 0 : run + 1;
        expect(run).toBeLessThanOrEqual(MAX_CONSECUTIVE_HIDDEN);
      }
    }
  });

  it('hits the requested fraction when the cap does not bite', () => {
    const mask = visibleWordMask(LONG, 'verse-1', {
      shownFraction: DEFAULT_SHOWN_FRACTION,
      maxConsecutiveHidden: Number.POSITIVE_INFINITY,
    });
    expect(mask.filter(Boolean)).toHaveLength(Math.round(LONG * DEFAULT_SHOWN_FRACTION));
  });

  it('shows everything at the walkthrough end of the dial', () => {
    expect(visibleWordMask(LONG, 'verse-1', { shownFraction: 1 }).every(Boolean)).toBe(
      true
    );
  });

  it('shows only the first word when nothing is asked for and nothing caps', () => {
    const mask = visibleWordMask(LONG, 'verse-1', {
      shownFraction: 0,
      maxConsecutiveHidden: Number.POSITIVE_INFINITY,
    });
    expect(mask.filter(Boolean)).toHaveLength(1);
  });

  it('handles the degenerate lengths', () => {
    expect(visibleWordMask(0, 'verse-1')).toEqual([]);
    expect(visibleWordMask(1, 'verse-1')).toEqual([true]);
  });
});
