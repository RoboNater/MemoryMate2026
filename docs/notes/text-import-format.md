# Plain-Text Verse Import

The format read by **My Verses → Import** (issue #15): a list somebody typed or
pasted, turned into verses. The parser is `src/utils/textImport.ts` and the
screen is `src/app/verse/import.tsx`.

This is not the JSON export/import in Settings (`docs/notes/data-format.md`).
That one round-trips the whole app — ids, progress, test results, sync metadata
— and is a versioned contract with files already on users' disks. This one
carries no history and no ids: every entry becomes a brand-new verse at comfort
level 1. Nothing here is a stable file format anyone else writes against, so it
can change; what it must not do is silently import something other than what
the screen previewed.

## The format

One verse per line, reference first:

```
John 3:16 - For God so loved the world, that he gave his one and only Son
Psalm 23:1 | The LORD is my shepherd, I lack nothing
Romans 12:1	Therefore, I urge you, brothers and sisters
```

A long verse can run onto the following lines:

```
John 3:16 - For God so loved the world, that he gave his one and only Son,
that whoever believes in him shall not perish but have eternal life.
```

Or the reference can sit on its own line, with the verse underneath and a blank
line between entries:

```
John 3:16
For God so loved the world, that he gave his one and only Son.

Psalm 23:1
The LORD is my shepherd, I lack nothing.
```

Also true:

- **Separators** are a tab, a `|`, an en/em dash (`–` `—`), or a hyphen with
  spaces on both sides. The first one on the line wins.
- **A bare hyphen must be spaced.** `John 3:16-17 - text` keeps the range in the
  reference, because `16-17` has no space around its hyphen. This asymmetry is
  the reason the rule isn't just "the first dash".
- **A colon is never a separator.** References are full of them.
- **Blank lines end an entry.** They are what makes the reference-on-its-own-line
  shape unambiguous.
- **Lines starting with `#` are dropped** entirely, so a hand-kept list can carry
  headings. A comment inside a verse does not split it.
- Whitespace in the verse text is collapsed to single spaces; CRLF line endings
  and a leading BOM are tolerated.
- The reference is stored exactly as written.

## The two decisions the issue asked for

**The delimiter**, above, plus one rule that isn't obvious: when a *second or
later* line of an entry also contains a separator, it starts a new verse only if
what sits before the separator looks like a reference — short (≤ 40 characters)
and containing a digit. Verse text contains dashes too, and without this,
"he was despised — and we esteemed him not" would start a new verse called "he
was despised" and quietly cut the previous one in half. An entry's *first* line
is never subjected to the test: there is nothing above it for it to continue.

The residual failure is a continuation line whose left half happens to be short
and numeric ("in 1 day - the temple"). The preview on the import screen is the
mitigation: it shows every entry the parser found, before anything is written.

**Duplicates are skipped, never merged or re-added.** A duplicate is a matching
reference *and* translation, compared with case and whitespace ignored, so
`1 John 3:16`, `1john 3:16` and `1 JOHN 3 : 16` are one verse — but the same
verse in NIV and ESV is two, which is correct: they are two things to memorize.
The comparison includes archived verses, since an archived verse is still yours
and re-importing it would resurrect it as a second, unarchived row. Skipping
rather than re-adding is the conservative half of the decision: the existing
verse carries progress and test history that an imported copy cannot, so the
copy is always the worse of the two.

Repeats *within one file* are skipped the same way, keeping the first.

## The other two questions, and how they were answered

- **Translation** is chosen once for the whole import, not per line. A per-line
  translation column would make the first line of every entry a small record
  format, which is exactly the weight this path exists to avoid.
- **Shelf**: imported verses land on the active shelf by default — it is the set
  the user is working in — and the screen lets any other shelf, or none, be
  picked instead. Creating a shelf from the import screen is not possible; see
  the issue linked from #15.

## Behaviour worth knowing

- **Nothing is written until the preview is confirmed.** The picked file lands in
  an editable text box, parsed on every keystroke, so a bad line can be fixed in
  place rather than back in the source file.
- **A bad line never fails the file.** Unreadable blocks are listed by line
  number and left out; the rest still imports.
- **The write is one transaction** (`verseService.addVerses`). A partial import
  is the worst outcome here, because it forces the user to diff their own file
  against the app by hand to find where it stopped.
- **Imported rows are staggered by a millisecond each** so the batch's order is
  stable in verse lists, which sort on `created_at`.
- Progress rows are not created up front; `progressService.getProgress` already
  returns a default for a verse that has none.
