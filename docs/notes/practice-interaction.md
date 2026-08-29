# How guided practice works

Written when first-letter practice was rebuilt as a guided, word-at-a-time exercise.
It records the interaction model, why that model makes a scoring problem disappear
rather than mitigating it, and the word-selection strategies that were considered and
deferred.

Companion to [`scoring-modes.md`](./scoring-modes.md), which covers how a typed answer is
*graded*. This note covers how it is *collected* — and the two turn out to be the same
question wearing different clothes.

> **Status: built.** #44 landed the interaction below, the seeded word mask, and the
> per-word tally. The blind whole-string mode described in
> [`scoring-modes.md`](./scoring-modes.md) is *gone from the app* — the rewrite replaced
> it rather than sitting beside it — but its scoring is untouched and still tested, and
> #45 restores the exercise itself under Test. Deliberately not built yet: the shake and
> the difficulty control (#47). The active slot now follows the software keyboard (#50).
> This note is here because the reasoning is what outlives the work — per `AGENTS.md`,
> durable "why" belongs in `docs/` rather than in an issue body nobody re-reads.

## What went wrong with the first version

First-letter practice shipped as a single blind attempt: type the whole letter sequence
into a text box, submit once, get a percentage. Two problems showed up as soon as it was
used.

**You could not tell where to type.** The slot row looked like the input but was a
passive readout; the real input was a text box below it whose placeholder was the same
`f g s l t w` string the instruction box used as its example, so it read as sample text
rather than an empty field. Nothing autofocused, so on web keystrokes went nowhere and on
mobile no keyboard appeared. Tapping the slot boxes — the intuitive thing — did nothing.

**It was a test, not practice.** A single graded attempt with no feedback until the end
is exactly what the Test flow is for. Practice wants scaffolding and immediate
correction; the mode as built was just an easier Test.

## The interaction

One slot per word, a cursor on one slot at a time, and one keystroke per word:

| event | result |
|---|---|
| correct letter | the word fills in, marked correct, cursor advances |
| first wrong letter | flagged, cursor **holds** — one more attempt |
| second wrong letter | the word is revealed, marked *missed*, cursor advances |
| space, or the Next button | the word is revealed, marked *skipped*, cursor advances |

Some words are shown in full before you type; the rest are blank. **The keystroke is the
same either way** — you type the first letter of a word you can see just as you do for a
word you can't. Showing a word is a memory aid, not a different exercise, which is what
keeps this one interaction rather than two stitched together.

## Why the cascade disappears

[`scoring-modes.md`](./scoring-modes.md) spends a section defending a real cost of the
blind version: scoring is positional, so dropping a single letter shifts every later word
out of alignment and turns the whole rest of the verse red. The accepted mitigation there
is that the slot row makes the cascade *legible* — you can see where it started.

The guided interaction removes the cost instead of mitigating it. A wrong letter never
advances the cursor, and after the second miss the app advances it deliberately. There is
no sequence of keystrokes that leaves the user's position out of step with the verse:

> **Alignment is enforced by the interaction rather than recovered by the scorer.**

This does not overturn the rule that note establishes — *recover alignment only when the
input format destroyed it* — it satisfies it in a stronger way. The blind whole-string
version still needs positional comparison, and that reasoning still applies wherever that
version lives.

### The consequence for scoring

Every guided session ends with every word filled in, so "what percentage did you get" is
not a meaningful question any more. The useful tally is per word:

- **correct** — right on the first try
- **recovered** — right on the second try
- **missed** — two wrong tries, revealed by the app
- **skipped** — the user asked for it

That is a better practice signal than a single percentage, because it distinguishes
"I knew it" from "I got there" from "I had no idea". It is still displayed and still not
stored — persisting per-mode practice results needs a data model, and that is tracked
separately in #31.

## Difficulty is one number

The fraction of words shown orders everything the tracker already holds:

| words shown | what it is |
|---|---|
| all | a rhythm walkthrough — step through the verse word by word, no recall pressure |
| about two thirds to three quarters | "easy" |
| none | the original exercise, but guided |
| none, and no slot row either | the hardest variant |

Worth noticing before anyone builds a separate feature: **the hardest variant (#32) is
the far end of this slider, not a different mode**, and the rhythm walkthrough is the
other end of the same slider rather than a new screen. The "fill in the blank" mode
listed in epic #18 is also partly absorbed here — the difference is only whether you
type a word's first letter or the whole word.

## Which words are shown

The chosen rule is **deterministic, seeded from the verse id**: the same words are blank
each time you practise a verse at a given difficulty. It is a pure function, so it is
cheap to test, it needs no stored state, and a verse does not feel like a different
exercise every run.

Three alternatives were considered and are recorded here rather than lost, because all
three are plausible and the choice is a question about learning, not about code. Any of
them could replace or join the default once there is real feedback on whether the fixed
pattern gets memorised instead of the verse.

| strategy | the case for it | why not now |
|---|---|---|
| **fixed per verse, seeded** | deterministic, pure, testable, needs no persistence | *chosen* |
| random each attempt | you cannot learn the pattern instead of the verse | a verse feels different every run, and non-determinism is harder to test |
| content words blanked, function words shown | pedagogically the sharpest — blanks land on the words worth cementing rather than on "the" and "of" | needs a stop-word list, which is English-only and unavoidably arbitrary |
| adaptive from past misses | the genuinely valuable one; blanks follow what you actually keep getting wrong | needs per-word history, i.e. the practice-results data model that does not exist yet |

The fixed rule should keep the **first word visible**, so there is always somewhere to
start.

## Two deliberate omissions

**No undo** (#46). Backspace does nothing. Undo is precisely a way back out of alignment,
which is the property the whole design buys, and it makes "exactly one more attempt"
ambiguous — can you backspace to reset your attempt count? Can you un-see a revealed
word? It is also the least reliable key on Android: the input holds no text to delete, so
some input methods emit no event at all, and key events there cover soft keyboards only.

**No audio or haptics in the first version.** Both are new dependencies, and haptics is
native-only — there is no web equivalent — so the visual feedback has to carry the whole
signal regardless of what is added later. Getting that right first is the prerequisite,
not the fallback.

## Where the code lives

Pure logic sits in `src/utils/`, per `AGENTS.md`. The interaction is a reducer over
`(cursor, attempts, per-slot status)` with no React and no I/O, so every rule above —
including "a punctuation keystroke is ignored and does not consume an attempt" — is
testable as data. The word-selection mask is a pure function alongside it.

One constraint worth preserving: the tokenizer stays shared with
[`scoring-modes.md`](./scoring-modes.md)'s definition of a word. The guided UI needs each
slot's word *text* as well as its letter, but that must be derived from the same split
rather than a second tokenizer, or `loving-kindness` starts meaning different things in
different modes.

As built:

| file | what it holds |
|---|---|
| `src/utils/guidedFirstLetter.ts` | the reducer, the tally, and the seeded visible-word mask |
| `src/utils/scoring.ts` | `firstLetterWords`, the one place a verse is split into words; `firstLetterTokens` is derived from it |
| `src/components/FirstLetterPractice.tsx` | the shell, and the input parked over the active slot |
| `src/components/LiveRegion.tsx` | announcements, because `announceForAccessibility` is an empty function on web |

The input deserves a note of its own, because two plausible-looking alternatives are dead
ends. It is **one** always-focused, visually-suppressed but real `TextInput`, absolutely
positioned over the active slot with its `value` pinned to `''`. A web-only
`document.addEventListener('keydown')` cannot work — react-native-web calls
`stopPropagation()` before invoking `onKeyPress`, React 19 attaches its listeners to the
root container rather than `document`, and mobile web has no keyboard at all without a
real focused control. One input per word is also out: a long verse would mean dozens of
native text fields, each holding an IME connection, with a focus hand-off on every
correct letter. And "which slot is active" is application state, not platform focus —
holding the cursor on a wrong letter means the two would diverge anyway.

Three of that component's props are load-bearing rather than tidy. `autoCorrect={false}`
sets Android's `NO_SUGGESTIONS`, without which a predictive-text insertion arrives as a
text change with *no key event at all*; `blurOnSubmit={false}` stops Return dismissing the
keyboard; and the input must have real, non-zero size and be on screen, because Android
will not focus a zero-sized view. Parking it over the active slot also makes the
platform's own scroll-into-view scroll the right thing.

The browser only performs that automatic scroll when the stable input first receives
focus, not when it moves to the next slot. The practice screens therefore own an explicit
visibility check. They intersect their `ScrollView` frame with the visual viewport on web
(`window.visualViewport`, which accounts for iOS Safari's overlaid keyboard) or the
reported keyboard frame on native, and scroll only when the newly active slot crosses
that boundary. The scroll is the minimum needed to reveal the slot, rather than a
re-centre on every letter, so it does not fight manual scrolling.

`visualViewport.offsetTop` is the obvious way to express that boundary in the slot's
layout-viewport coordinate space, but Safari can leave it stale in either direction while
the keyboard pans the visual viewport. Taking the larger value fixes keyboard opening but
can under-correct while it closes. The web path therefore trusts
`visualViewport.pageTop - window.scrollY` and repeats the check after WebKit settles.

## How this was decided — 18 August 2026

Recorded because most of what follows is a set of forks where the discarded branch was
reasonable, and the next person to look at this will re-derive them otherwise.

The trigger was using the mode rather than reviewing it. Three days after #29 merged, two
complaints: you can't tell where to type, and the mode "really isn't helpful for
practice — it's more like an easier version of test". The first read as a small UI bug
and turned out not to be one; the second was the real finding, and it was a finding about
the *design* rather than the implementation, which had shipped clean and well documented.

**Fork 1 — is the input problem separable?** Initially filed in the head as a quick fix:
autofocus the box, restyle it so it doesn't read as an example. Rejected, because making
the slot row the thing you type into is the same mechanism as typing word-by-word with
feedback. Fixing the affordance against the whole-string box would have been thrown away
within one issue. So the two complaints became one issue, not two.

**Fork 2 — where does the blind version go?** Three options: keep it as a second mode
beside the guided one, drop it, or move it to Test. Moving it won on the same logic that
produced the complaint — "it's an easier version of test" is a diagnosis, and the honest
response to it is to put the exercise in the flow where single-shot grading belongs
rather than to delete a perfectly good exercise. It turned out not to be free: `test_results`
has no mode dimension, so this needs a schema change, which is why it's #45 and not a
bullet in #44.

**Fork 3 — how much feedback in the first version?** Haptics and audio were both on the
table and both deferred. The deciding argument wasn't cost: haptics is native-only, so
the visual feedback has to be sufficient on its own no matter what gets added later.
Building the visual layer properly is the prerequisite, not the fallback.

**Fork 4 — which words are shown.** The four strategies in the table above were weighed
together. "Fixed per verse, seeded" won on being pure and testable with no stored state,
not on being the best exercise — adaptive is almost certainly the best exercise, and it
is unavailable until there is somewhere to store per-word history. This is the decision
most likely to be revisited, which is why all four are written down rather than just the
winner.

### What the first implementation deferred — and how it was settled

#44 deliberately shipped the input mechanism before its decoration and controls, so
real-device use could constrain the visual layer rather than forcing it to be rebuilt.
#47 completed that second stage.

**A wrong letter shakes the visible slot.** The box and its cursor or wrong-letter cue
move together from one Reanimated shared value, on animated layers that exist from the
first render. A toggled NativeWind animation class would make react-native-css-interop
upgrade and remount the slot mid-exercise, precisely when the input must retain its place
and focus. The measured box wrapper stays outside the transform as well, so the
auto-scroll coordinates introduced in #50 cannot pick up a transient horizontal offset
while the visual layers move.

**Difficulty is a named three-point control.** `DEFAULT_SHOWN_FRACTION` remains two thirds
and is exposed as Easy. Challenge asks for a zero shown fraction (the first-word and
maximum-hidden-run safety rules still apply), while Rhythm walkthrough shows every word.
The choices live beneath First letters on the Practice tab rather than becoming extra
top-level modes. They appear as stacked, full-width cards only when that mode is selected,
which leaves room for each description without crowding the two-up mode row. The
device-local selection is carried through the whole session. This keeps the conceptual
model honest: all three are points on one guided-practice dial.

**Words are never blanked in runs longer than three.** "Keep the first word visible" alone
turned out not to be enough: a seeded two-thirds mask can still deal six blanks in a row,
which is exactly the experience the setting exists to avoid. `MAX_CONSECUTIVE_HIDDEN`
caps the run, and both rules can push the realised fraction above the target. That is
accepted — the fraction is a dial, not a contract.

Splitting #44 and #47 was worthwhile: real-device input behaviour under a non-Gboard
Android IME was the kind of unknown that reading sources could not settle, while naming
the second stage kept the temporary lack of feedback and controls from becoming the
permanent design by accident.

### An observation worth keeping

The guided design makes a previously-defended cost disappear, and that is the second time
this mode's central problem has been solved by changing the *input format* rather than the
scoring. #29 established "recover alignment only when the input format destroyed it"; this
round adds the stronger move — arrange the input format so alignment is never destroyed.
Both times the temptation was to make the comparison cleverer. Worth remembering when the
remaining #18 modes get designed: scrambled words in particular will present the same
temptation.

### What came out of it

#44 (the rebuild), #47 (visual feedback and the difficulty control), #45 (blind version
to Test), #46 (no undo, deliberately), and this note. #32 was reframed rather than
refiled — it turned out to be the far end of the difficulty axis rather than a standalone
variant.
