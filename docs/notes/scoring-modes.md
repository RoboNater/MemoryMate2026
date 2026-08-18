# How recall modes are scored

Written alongside the first-letter practice mode (issue #29, first slice of epic
#18). It records the rule the app now follows for grading a typed answer, and
why that rule inverts the decision full-recall scoring made.

Both functions live in `src/utils/scoring.ts` and both are under test in
`src/utils/__tests__/scoring.test.ts`.

> **Update, August 2026.** Everything below describes the blind whole-string
> first-letter mode as built in #29, which is still how the app works today. That
> mode is being rebuilt as a guided, word-at-a-time exercise (#44), and the blind
> version moves to the Test flow (#45). The rule this note establishes survives
> both; the cascade section below stops applying to practice once #44 lands. Design
> for the replacement is in [`practice-interaction.md`](./practice-interaction.md).

## The rule: recover alignment only when the input format destroyed it

The two modes compare a typed answer against the stored verse text in opposite
ways, and the difference is not a matter of taste.

**Full recall** (`calculateScore`, used by Test) takes free-typed prose. Nothing
in that input says which typed word was *meant* to be which verse word. Omit one
word and every later word shifts; a position-by-position compare would call all
of them wrong, which no human grader would. So the alignment has to be
reconstructed, and a longest common subsequence is how that's done.

**First letter** (`calculateFirstLetterScore`) takes exactly one token per verse
word. The alignment isn't missing — the input format supplies it. Comparing
positionally is therefore not a weaker approximation of LCS; it is the compare
that uses all the available information. Running LCS on top of a known alignment
throws that information away, and over a 26-symbol alphabet with English's very
skewed first-letter distribution it buys back noise: a completely wrong answer
scores about a third correct. There is a test pinning exactly that number, next
to the positional result of 0%.

So: **LCS is correct for unaligned input, positional is correct for aligned
input.** That's the rule to apply to the remaining modes in #18 rather than
reaching for whichever function already exists. Scrambled words, for instance,
is aligned in neither sense and will want a third comparison again.

### The accepted cost

Positional scoring cascades. Drop one letter and every later slot reads as
wrong. That is not mitigated in code — no alignment repair, deliberately, on
the grounds that repair heuristics shouldn't be designed before anyone has used
the mode. It's mitigated in the UI instead: the answer is shown as one slot per
word, so a cascade is visible as "everything from here is red", which is the
information the user needs to spot that they dropped a word.

The "before anyone has used the mode" condition has since been met, and the answer
turned out not to be a repair heuristic at all. Guided practice (#44) prevents the
misalignment instead of repairing it: a wrong letter never advances the cursor, so
the user cannot get out of step in the first place. The cascade stays a real cost of
blind whole-string entry, which is why this section keeps standing once that mode
moves to Test (#45) — it just stops being practice's problem. See
[`practice-interaction.md`](./practice-interaction.md).

### Typing past the end of the verse is penalized

Extra tokens beyond the last word leave `matches` and `total` alone — `total`
is the verse's word count, which is what the slot row renders — but they are
charged to the denominator, so a perfect sequence plus three stray letters
reads "6 of 6 words, 3 extra, 67%".

This deliberately does *not* match `calculateScore`, where insertions cost
nothing and the question is still open (#23). The two aren't the same question:

- In free prose an insertion is **ambiguous** — synonym, typo, false start,
  a restart of the whole verse. The penalty is undefined because the event is,
  which is why #23 is a decision rather than a bug.
- Here the slot count is on screen *before* the user types a letter. An extra
  token is unambiguously a mistake, against a rule they could see.

There's also an asymmetry argument that settles it independently of #23:
typing too *few* letters is already punished, because the unfilled slots score
wrong. Leaving overshoot free would treat the same error differently depending
on which side of the slot count it fell on.

Note the exposure was always narrower than "insertions are free": an extra
token *inside* the verse is punished hard by the cascade. Only overflow past
the last word ever scored for free.

## What counts as a word

`firstLetterTokens` splits on whitespace — the same boundary `calculateScore`
uses — and takes each word's first letter *or digit*, lowercased.

| input | tokens | why |
|---|---|---|
| `"For` | `f` | leading punctuation skipped |
| `God's` | `g` | one word, one letter |
| `loving-kindness` | `l` | one whitespace-delimited word, so one slot |
| `40 days` | `4 d` | digits are legal tokens |
| a bare `—` | *(dropped)* | no alphanumeric character, so it never asks for a keystroke |

Keeping one definition of "word" across both modes was worth more than a
cleverer tokenizer. It's also the count already shown to the user elsewhere on
the practice screens (`verse.text.split(' ').length`).

The hyphenate rule is the genuinely arbitrary one. It's tolerable only because
the slot row makes it visible: the user can see `loving-kindness` occupying one
box rather than having to guess.

On the input side, `parseFirstLetterInput` discards everything that isn't a
letter or digit, so `fgsltw`, `f g s l t w` and `f,g,s,l,t,w` are one answer.
Requiring separators on a phone keyboard would cost the user something and buy
nothing.

## Why the slots are shown at all

A blank text box is a meaningfully harder exercise, and it was rejected for this
first version for three reasons, in order of weight:

1. It would make the word rule above unguessable.
2. It would make the positional cascade unexplainable — indistinguishable, from
   the user's side, from the app being broken.
3. A blank box *implies* forgiving alignment, i.e. it implies LCS. Blank box
   plus positional scoring is the incoherent combination.

The harder variant is a reasonable difficulty setting later; it is not a
setting now. Tracked in #32.

## What a graded practice score means

Nothing is stored. The percentage is displayed as feedback and discarded; the
user still sets their own comfort level, and `recordPractice` / `setComfortLevel`
are called exactly as the reveal flow calls them.

The score and the comfort level measure different things — "how well did I do
off a letter cue just now" versus "how ready do I feel". Feeding the first into
the second would overwrite a field whose entire current meaning is the user's
own judgment, with no way to tell derived rows from user-set rows in data that
already exists.

Persisting per-mode practice scores is a real feature and a separate one: it
needs a schema change, a sync path, and RLS policies. Tracked in #31 rather than
smuggled in here.
