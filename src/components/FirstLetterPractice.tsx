import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  LayoutRectangle,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createGuidedState,
  guidedReducer,
  guidedTally,
  isComplete,
  type GuidedSlot,
  type GuidedState,
  type GuidedTally,
} from '../utils/guidedFirstLetter';
import type { ActiveSlotMeasurement } from '../utils/activeSlotVisibility';
import { LiveRegion } from './LiveRegion';

interface FirstLetterPracticeProps {
  verseText: string;
  /** Seeds which words are shown, so a verse blanks the same words each time. */
  verseId: string;
  translation: string;
  /**
   * Fires once, when every word has been settled. The caller decides what that
   * means for progress; this component records nothing itself.
   */
  onComplete: (tally: GuidedTally) => void;
  /** Reports the focused slot in window coordinates to its owning screen. */
  onActiveSlotLayout?: (layout: ActiveSlotMeasurement | null) => void;
}

// The input has to exist at a real size on the very first frame or Android
// will not focus it, and the first slot has not been measured by then.
const FALLBACK_SLOT: LayoutRectangle = { x: 0, y: 0, width: 34, height: 36 };

/**
 * Guided "type the first letter of each word" practice (issue #44).
 *
 * The slot row *is* the input. A single visually-suppressed but real TextInput
 * is parked over the active slot, which is what makes the keyboard appear, what
 * makes the platform scroll the right thing into view, and what fixes the
 * original mode's central problem: you could not tell where to type.
 *
 * Which slot is active is application state, not platform focus -- a wrong
 * letter holds the cursor, so the two would diverge anyway. See
 * `docs/notes/practice-interaction.md`.
 */
export function FirstLetterPractice({
  verseText,
  verseId,
  translation,
  onComplete,
  onActiveSlotLayout,
}: FirstLetterPracticeProps) {
  const [state, dispatch] = useReducer(
    guidedReducer,
    { verseText, verseId },
    createGuidedState
  );
  // The active slot's rectangle, in the row's coordinate space, asked for
  // rather than remembered. See `measureActive` below for why.
  const [activeLayout, setActiveLayout] = useState<LayoutRectangle>(FALLBACK_SLOT);
  const [focused, setFocused] = useState(false);
  const rowRef = useRef<React.ComponentRef<typeof View>>(null);
  const boxRefs = useRef<Record<number, React.ComponentRef<typeof View> | null>>({});
  const inputRef = useRef<TextInput>(null);
  const measurementRequestRef = useRef(0);

  const finished = isComplete(state);
  const total = state.slots.length;
  const tally = guidedTally(state);

  // Fires exactly once, on the transition into completion. `state` is in the
  // dependencies rather than the tally, which is a fresh object every render;
  // the ref is what actually keeps it to one call.
  const reported = useRef(false);
  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    onComplete(guidedTally(state));
  }, [finished, state, onComplete]);

  // `onChangeText` is the only channel. Backspace is deliberately absent (#46)
  // and Return is a no-op, so there is no key that produces no text change --
  // wiring `onKeyPress` as well would only risk dispatching a keystroke twice.
  const handleChangeText = useCallback((text: string) => {
    // The controlled-value restore to '' comes back through here.
    if (text.length === 0) return;
    if (text === ' ') {
      dispatch({ type: 'skip' });
      return;
    }
    // Not one character: an iOS autocorrect replacement arrives as the whole
    // inserted string, and a paste as the whole clipboard. Neither is an answer.
    if (text.length !== 1) return;
    dispatch({ type: 'letter', value: text });
  }, []);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  const activeWord = finished ? null : state.slots[state.cursor];

  /**
   * Measure the active slot against the row, on demand.
   *
   * `onLayout` cannot do this job on web. react-native-web drives it from a
   * ResizeObserver, which fires when a node *resizes* and never when it merely
   * *moves* -- and revealing a word widens its slot, which reflows every later
   * slot in the row. Cached coordinates therefore drift further out of date
   * with each reveal, silently, and only on web. `measureLayout` recomputes
   * from the live boxes instead, so there is nothing to go stale.
   */
  const cursor = state.cursor;
  const measureActive = useCallback(() => {
    const request = ++measurementRequestRef.current;
    const row = rowRef.current;
    const box = boxRefs.current[cursor];
    if (!row || !box) return;
    box.measureLayout(
      row,
      (x, y, width, height) => {
        if (request !== measurementRequestRef.current) return;
        setActiveLayout((prev) =>
          prev.x === x && prev.y === y && prev.width === width && prev.height === height
            ? prev
            : { x, y, width, height }
        );
        if (focused && onActiveSlotLayout) {
          box.measureInWindow((windowX, windowY, windowWidth, windowHeight) => {
            if (request !== measurementRequestRef.current) return;
            onActiveSlotLayout({
              x: windowX,
              y: windowY,
              width: windowWidth,
              height: windowHeight,
              slotIndex: cursor,
            });
          });
        }
      },
      () => {}
    );
  }, [cursor, focused, onActiveSlotLayout]);

  useEffect(() => {
    if (finished) {
      measurementRequestRef.current += 1;
      onActiveSlotLayout?.(null);
    }
  }, [finished, onActiveSlotLayout]);

  useEffect(
    () => () => {
      measurementRequestRef.current += 1;
      onActiveSlotLayout?.(null);
    },
    [onActiveSlotLayout]
  );

  // Every event can reflow the row, so re-measure on each one -- `seq` changes
  // whenever the reducer changed anything. The row's own `onLayout` covers the
  // other trigger, a container resize or rotation.
  useEffect(measureActive, [measureActive, state.seq]);

  const inputLabel = finished
    ? 'Practice complete'
    : `First letter of word ${state.cursor + 1} of ${total}` +
      (activeWord?.visible ? `, ${activeWord.word}` : '');

  return (
    <View>
      <LiveRegion message={announcement(state, finished, tally)} nonce={state.seq} />

      {!finished && (
        <View className="mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
          <Text className="text-amber-900 font-medium mb-2">
            Type the first letter of each word
          </Text>
          <Text className="text-amber-700 text-sm">
            One letter per box, in order. Some words are shown to help — type their
            first letter too. A wrong letter gives you one more try.
          </Text>
        </View>
      )}

      <View className="mb-4 bg-white p-4 rounded-xl border-2 border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-700">
            {finished ? 'How it went' : `Word ${state.cursor + 1} of ${total}`}
          </Text>
          <Text className="text-xs text-gray-500">{total} words</Text>
        </View>

        {/* The slot row and the input that sits on top of it. The row is
            decorative to a screen reader -- the input carries the label. */}
        {/* `accessible={false}`: this exists to give the slot row a tap target,
            not to be a control. Without it a screen reader announces an
            unlabelled button sitting in front of the real input. */}
        <TouchableOpacity activeOpacity={1} onPress={focusInput} accessible={false}>
          {/* The positioning parent. The row must stay its only flow child, so
              the row's origin is this View's origin, and the input must stay a
              sibling of the row rather than inside it -- the row is hidden from
              the accessibility tree and the input must not be. */}
          <View>
            <View
              ref={rowRef}
              onLayout={measureActive}
              className="flex-row flex-wrap gap-1.5"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              aria-hidden
            >
              {state.slots.map((slot, index) => (
                <Slot
                  key={index}
                  slot={slot}
                  active={!finished && index === state.cursor}
                  flagged={!finished && index === state.cursor && state.attempts > 0}
                  boxRef={(node) => {
                    boxRefs.current[index] = node;
                  }}
                />
              ))}
            </View>

            {!finished && (
              <TextInput
                ref={inputRef}
                // Pinned empty. React's value tracker is reset by the controlled
                // restore in the same flush, so `f`, `f`, `f` still produces
                // three changes -- and nothing accumulates for an Android IME to
                // build a composing region out of.
                value=""
                onChangeText={handleChangeText}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  measurementRequestRef.current += 1;
                  setFocused(false);
                  onActiveSlotLayout?.(null);
                }}
                autoFocus
                // Every one of these overrides a react-native-web default that
                // works against us. `autoCorrect={false}` is the load-bearing
                // one: it sets Android's NO_SUGGESTIONS, and without it a
                // predictive-text insertion arrives with no key event at all.
                autoCorrect={false}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                // Or Return dismisses the keyboard on both platforms.
                blurOnSubmit={false}
                // We draw our own cursor on the active slot.
                caretHidden
                textContentType="none"
                importantForAutofill="no"
                accessibilityLabel={inputLabel}
                style={{
                  position: 'absolute',
                  left: activeLayout.x,
                  top: activeLayout.y,
                  width: activeLayout.width,
                  height: activeLayout.height,
                  color: 'transparent',
                  backgroundColor: 'transparent',
                  padding: 0,
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {!finished && (
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={() => dispatch({ type: 'skip' })}
            className="bg-gray-200 py-3 rounded-lg items-center"
            accessibilityRole="button"
          >
            <Text className="text-gray-700 font-semibold text-base">
              Skip word — show me
            </Text>
          </TouchableOpacity>

          {/* Never refocus on blur: that is a keyboard trap a web user cannot
              Tab out of. Offer the way back instead. */}
          {!focused && (
            <TouchableOpacity
              onPress={focusInput}
              className="py-2 items-center"
              accessibilityRole="button"
            >
              <Text className="text-blue-600 text-sm font-medium">
                Tap here to keep typing
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {finished && (
        <View className="mb-6">
          {/* A per-word tally, not a percentage: every guided run ends with
              every word filled in, so a percentage would say nothing. Feedback
              only -- nothing here is stored, and it does not set the comfort
              level (#31). */}
          <View className="mb-4 flex-row flex-wrap gap-2">
            <TallyPill label="Knew it" count={tally.correct} tone="green" />
            <TallyPill label="Second try" count={tally.recovered} tone="amber" />
            <TallyPill label="Missed" count={tally.missed} tone="red" />
            <TallyPill label="Skipped" count={tally.skipped} tone="gray" />
          </View>

          <View className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
            <Text className="text-gray-800 text-lg leading-8 mb-4">{verseText}</Text>
            <View className="pt-4 border-t border-green-200">
              <Text className="text-sm text-green-700 font-medium">{translation}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// --- Pieces ---------------------------------------------------------------

function Slot({
  slot,
  active,
  flagged,
  boxRef,
}: {
  slot: GuidedSlot;
  active: boolean;
  flagged: boolean;
  /** The box the input is parked over; the caller measures it against the row. */
  boxRef: (node: React.ComponentRef<typeof View> | null) => void;
}) {
  // A word is shown once it is settled, and beforehand only if it was chosen
  // as a memory aid. Either way it still asks for its first letter.
  const shown = slot.status !== 'pending' || slot.visible;
  const label = shown ? slot.word : '';

  let box = 'bg-gray-50 border-gray-300';
  let text = 'text-gray-500';

  if (slot.status === 'correct') {
    box = 'bg-green-100 border-green-400';
    text = 'text-green-800';
  } else if (slot.status === 'recovered') {
    box = 'bg-amber-100 border-amber-400';
    text = 'text-amber-800';
  } else if (slot.status === 'missed') {
    box = 'bg-red-100 border-red-400';
    text = 'text-red-800';
  } else if (slot.status === 'skipped') {
    box = 'bg-gray-100 border-gray-400 border-dashed';
    text = 'text-gray-600';
  } else if (flagged) {
    box = 'bg-red-50 border-red-500 border-2';
    text = 'text-gray-900';
  } else if (active) {
    box = 'bg-blue-50 border-blue-500 border-2';
    text = 'text-gray-900';
  }

  return (
    <View className="items-center">
      <View
        ref={boxRef}
        style={{ minWidth: 34 }}
        className={`h-9 px-1.5 rounded border items-center justify-center ${box}`}
      >
        <Text
          className={`font-semibold ${label.length > 1 ? 'text-sm' : 'text-base uppercase'} ${text}`}
          numberOfLines={1}
        >
          {label || ' '}
        </Text>
      </View>
      {/* The active slot's cursor, and under a missed word, what was typed. */}
      <View className="h-4 items-center justify-start">
        {active && <View className="w-4 h-0.5 mt-0.5 bg-blue-500 rounded-full" />}
        {!active && slot.status === 'missed' && slot.wrongLetter && (
          <Text className="text-[10px] text-red-400 uppercase">{slot.wrongLetter}</Text>
        )}
      </View>
    </View>
  );
}

const TALLY_TONES = {
  green: 'bg-green-100 border-green-300 text-green-800',
  amber: 'bg-amber-100 border-amber-300 text-amber-800',
  red: 'bg-red-100 border-red-300 text-red-800',
  gray: 'bg-gray-100 border-gray-300 text-gray-700',
} as const;

function TallyPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: keyof typeof TALLY_TONES;
}) {
  const [bg, border, text] = TALLY_TONES[tone].split(' ');
  return (
    // Inline minWidth: this project is on Tailwind 3.3, where `min-w-*` has no
    // spacing scale and the class would be silently dropped.
    <View
      style={{ minWidth: 80 }}
      className={`flex-1 py-3 rounded-lg border items-center ${bg} ${border}`}
    >
      <Text className={`text-2xl font-bold ${text}`}>{count}</Text>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}

function announcement(state: GuidedState, finished: boolean, tally: GuidedTally): string {
  if (finished) {
    return `Finished. ${tally.correct} knew, ${tally.recovered} on the second try, ${tally.missed} missed, ${tally.skipped} skipped.`;
  }

  const feedback = state.lastFeedback;
  if (!feedback) return '';

  const word = state.slots[feedback.slot]?.word ?? '';
  switch (feedback.kind) {
    case 'correct':
      return `Correct, ${word}.`;
    case 'wrong':
      return 'Not quite. One more try.';
    case 'revealed':
      return `Missed. The word is ${word}.`;
    case 'skipped':
      return `Skipped. The word is ${word}.`;
  }
}
