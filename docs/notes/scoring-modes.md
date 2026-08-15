# How recall modes are scored

Written alongside the first-letter practice mode (issue #29, first slice of epic
#18). It records the rule the app now follows for grading a typed answer, and
why that rule inverts the decision full-recall scoring made.

Both functions live in `src/utils/scoring.ts` and both are under test in
`src/utils/__tests__/scoring.test.ts`.

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
