/**
 * Plain-text verse import: reading a hand-written list into verse records
 * (issue #15).
 *
 * Deliberately not the JSON export/import in `src/services/dataExportService.ts`.
 * That one round-trips the whole app -- ids, progress, test results, sync
 * metadata -- and is a versioned contract with files already on users' disks.
 * This one reads a list somebody typed or pasted, carries no history, and its
 * only job is to turn text into `{ reference, text }` pairs plus a report of
 * what it could not read.
 *
 * The format is documented for users in `docs/notes/text-import-format.md`;
 * the rules below are its specification.
 *
 * No React and no I/O, so the whole format is testable as data. The screen
 * (`src/app/verse/import.tsx`) shows what these functions return *before*
 * anything is written -- which is why problems and skips are returned as
 * values rather than thrown: a file with one bad line should still import its
 * other 40 verses, and the user should see that before committing to it.
 */

/** One verse read out of the file. */
export interface ParsedVerseEntry {
  /** The reference exactly as written, trimmed. */
  reference: string;
  /** The verse text, with runs of whitespace (including line breaks) collapsed to single spaces. */
  text: string;
  /** 1-based line number the entry starts on, so the user can find it in their file. */
  line: number;
}

/** A block the parser could not read as a verse. */
export interface TextImportProblem {
  /** 1-based line number the unreadable block starts on. */
  line: number;
  /** What is wrong with it, in the user's terms. */
  message: string;
  /** The start of the offending block, truncated, so it can be pointed at on screen. */
  excerpt: string;
}

export interface ParsedVerseFile {
  entries: ParsedVerseEntry[];
  problems: TextImportProblem[];
}

/** Why a successfully-parsed entry is not going to be imported. */
export type SkipReason = 'duplicate-in-file' | 'duplicate-existing';

export interface SkippedEntry {
  entry: ParsedVerseEntry;
  reason: SkipReason;
}

export interface TextImportPlan {
  /** Entries that will be written, in file order. */
  toImport: ParsedVerseEntry[];
  /** Entries that parsed fine but are duplicates, in file order. */
  skipped: SkippedEntry[];
  /** Carried through from parsing so the screen has one object to render. */
  problems: TextImportProblem[];
}

/** Just enough of a `Verse` to detect a duplicate against. */
export interface ExistingVerseKey {
  reference: string;
  translation: string;
}

/**
 * What separates the reference from the verse text on a line.
 *
 * Leftmost match wins, and the reference is line-initial, so in practice this
 * is the first punctuation the user put after "John 3:16".
 *
 * A bare hyphen must have whitespace on both sides; an en/em dash need not.
 * That asymmetry is the whole point: chapter-verse ranges are written
 * `John 3:16-18`, so a hyphen with no space around it is part of the
 * reference, never the separator. Nobody writes a range with an em dash.
 *
 * A colon is deliberately absent: references are full of them.
 */
const SEPARATOR = /\t|\s*[\u2013\u2014]\s*|\s+-\s+|\s*\|\s*/;

/** Comment lines let a hand-maintained list carry headings. Dropped entirely. */
const COMMENT = /^\s*#/;

/** How much of an unreadable block to quote back at the user. */
const EXCERPT_LENGTH = 60;

/**
 * The longest a reference can be before a mid-verse separator is the likelier
 * reading. See `looksLikeReference`.
 */
const MAX_REFERENCE_LENGTH = 40;

interface SourceLine {
  text: string;
  /** 1-based line number in the original file. */
  line: number;
}

/**
 * Parse the contents of a plain-text verse file.
 *
 * Two shapes, and which one is in play is decided by an entry's first line:
 *
 * - `Reference<separator>text` -- one verse per line. A following line that
 *   also looks like `Reference<separator>text` starts the next verse; one that
 *   doesn't continues this verse's text.
 * - A line with no separator, followed by more lines -- the first line is the
 *   whole reference and everything under it, up to the next blank line, is the
 *   text.
 *
 * A blank line always ends an entry, which is what makes the second shape
 * unambiguous.
 *
 * Never throws and never rejects a whole file for one bad block: anything it
 * cannot read comes back in `problems` while the rest still parses.
 */
export function parseVerseTextFile(contents: string): ParsedVerseFile {
  const entries: ParsedVerseEntry[] = [];
  const problems: TextImportProblem[] = [];

  // Strip a BOM (files saved by Windows editors routinely have one; left in,
  // it becomes part of the first reference) and normalize line endings.
  const normalized = contents.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  /** Finish one entry: validate it, then file it under entries or problems. */
  const commit = (reference: string, textParts: string[], line: number, source: string) => {
    const trimmedReference = reference.trim();
    const text = collapseWhitespace(textParts.join(' '));

    if (!trimmedReference) {
      problems.push({ line, message: 'Missing reference.', excerpt: excerpt(source) });
      return;
    }
    if (!text) {
      problems.push({
        line,
        message: `No verse text after the reference "${trimmedReference}".`,
        excerpt: excerpt(source),
      });
      return;
    }

    entries.push({ reference: trimmedReference, text, line });
  };

  for (const block of splitIntoBlocks(normalized)) {
    const first = block[0];
    const firstSplit = splitOnSeparator(first.text);

    if (!firstSplit) {
      if (block.length === 1) {
        problems.push({
          line: first.line,
          message:
            'No separator between the reference and the verse. Use "John 3:16 - text", or put the reference on its own line above the verse.',
          excerpt: excerpt(first.text),
        });
        continue;
      }
      // Reference on its own line, text underneath, to the end of the block.
      commit(first.text, block.slice(1).map((l) => l.text), first.line, first.text);
      continue;
    }

    // One verse per line, with unseparated lines continuing the one above.
    let reference = firstSplit.reference;
    let textParts = [firstSplit.text];
    let line = first.line;
    let source = first.text;

    for (const next of block.slice(1)) {
      const split = splitOnSeparator(next.text);
      if (split && looksLikeReference(split.reference)) {
        commit(reference, textParts, line, source);
        reference = split.reference;
        textParts = [split.text];
        line = next.line;
        source = next.text;
      } else {
        textParts.push(next.text);
      }
    }
    commit(reference, textParts, line, source);
  }

  return { entries, problems };
}

/**
 * Decide what a parsed file would actually add, given what is already there.
 *
 * Duplicates are skipped rather than merged or re-added: this path has no ids
 * and no progress, so the existing verse is always the better copy --
 * re-adding one would leave its practice history behind on a row the user can
 * no longer tell apart from the new one.
 *
 * A duplicate is a matching reference *and* translation, since the same verse
 * in NIV and ESV is two things worth memorizing separately. `existing` should
 * include archived verses: an archived verse is still yours, and re-importing
 * it would resurrect it as a second, unarchived row.
 */
export function planTextImport(
  parsed: ParsedVerseFile,
  existing: ExistingVerseKey[],
  translation: string
): TextImportPlan {
  const seen = new Set(existing.map((v) => duplicateKey(v.reference, v.translation)));
  const fromFile = new Set<string>();
  const toImport: ParsedVerseEntry[] = [];
  const skipped: SkippedEntry[] = [];

  for (const entry of parsed.entries) {
    const key = duplicateKey(entry.reference, translation);
    if (seen.has(key)) {
      // A repeat within the file and a clash with the library are worth
      // telling apart on screen: one is a typo in the file, the other is
      // "you already have this".
      skipped.push({ entry, reason: fromFile.has(key) ? 'duplicate-in-file' : 'duplicate-existing' });
      continue;
    }
    seen.add(key);
    fromFile.add(key);
    toImport.push(entry);
  }

  return { toImport, skipped, problems: parsed.problems };
}

/**
 * The key two verses are the same under.
 *
 * Whitespace and case are dropped so `1 John 3:16`, `1john 3:16` and
 * `1 JOHN 3 : 16` are one verse. This is only ever a comparison key -- the
 * reference is stored exactly as the user wrote it.
 */
export function duplicateKey(reference: string, translation: string): string {
  const strip = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  // NUL can't occur in either half, so the join is unambiguous.
  return `${strip(reference)}\u0000${strip(translation)}`;
}

/** Split a line at its first separator, or null if it has none. */
function splitOnSeparator(line: string): { reference: string; text: string } | null {
  const match = line.match(SEPARATOR);
  if (!match || match.index === undefined) return null;
  return {
    reference: line.slice(0, match.index),
    text: line.slice(match.index + match[0].length),
  };
}

/**
 * Could this be a reference, or is it the middle of a sentence?
 *
 * Only consulted for the *second* and later lines of an entry, where the
 * alternative reading is "this line continues the verse above". Verse text
 * does contain dashes -- "he was despised -- and we esteemed him not" would
 * otherwise start a new verse called "he was despised" and quietly cut the
 * previous one in half.
 *
 * So a continuation line is promoted to a new entry only when what sits before
 * its separator reads like a reference: short, and carrying a number, which
 * chapter-and-verse always does. An entry's first line is never subjected to
 * this -- there is nothing for it to continue.
 */
function looksLikeReference(candidate: string): boolean {
  const trimmed = candidate.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_REFERENCE_LENGTH && /\d/.test(trimmed);
}

/**
 * Split into blank-line-separated blocks, dropping comment lines and keeping
 * each surviving line's original number for error reporting.
 */
function splitIntoBlocks(text: string): SourceLine[][] {
  const blocks: SourceLine[][] = [];
  let current: SourceLine[] = [];

  text.split('\n').forEach((raw, index) => {
    if (COMMENT.test(raw)) return;
    if (raw.trim() === '') {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      return;
    }
    current.push({ text: raw, line: index + 1 });
  });

  if (current.length > 0) blocks.push(current);
  return blocks;
}

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function excerpt(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > EXCERPT_LENGTH ? `${trimmed.slice(0, EXCERPT_LENGTH)}…` : trimmed;
}
