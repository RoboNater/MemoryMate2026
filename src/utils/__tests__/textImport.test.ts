import {
  duplicateKey,
  parseVerseTextFile,
  planTextImport,
  type ExistingVerseKey,
} from '../textImport';

describe('parseVerseTextFile', () => {
  it('reads one verse per line, separated by a spaced hyphen', () => {
    const { entries, problems } = parseVerseTextFile(
      'John 3:16 - For God so loved the world\nPsalm 23:1 - The LORD is my shepherd'
    );

    expect(problems).toEqual([]);
    expect(entries).toEqual([
      { reference: 'John 3:16', text: 'For God so loved the world', line: 1 },
      { reference: 'Psalm 23:1', text: 'The LORD is my shepherd', line: 2 },
    ]);
  });

  it('accepts a tab, a pipe, an en dash and an em dash as the separator', () => {
    const { entries } = parseVerseTextFile(
      ['John 1:1\tIn the beginning', 'John 1:2 | He was with God', 'John 1:3 – Through him', 'John 1:4—In him was life'].join(
        '\n'
      )
    );

    expect(entries.map((e) => e.reference)).toEqual(['John 1:1', 'John 1:2', 'John 1:3', 'John 1:4']);
    expect(entries.map((e) => e.text)).toEqual([
      'In the beginning',
      'He was with God',
      'Through him',
      'In him was life',
    ]);
  });

  it('keeps an unspaced hyphen in the reference, so verse ranges survive', () => {
    const { entries } = parseVerseTextFile('John 3:16-17 - For God so loved the world');

    expect(entries).toEqual([
      { reference: 'John 3:16-17', text: 'For God so loved the world', line: 1 },
    ]);
  });

  it('keeps an en- or em-dash verse range in the reference (PR #52 review)', () => {
    const endash = parseVerseTextFile('John 3:16\u201317 - For God so loved the world');
    expect(endash.entries).toEqual([
      { reference: 'John 3:16\u201317', text: 'For God so loved the world', line: 1 },
    ]);

    const emdash = parseVerseTextFile('John 3:16\u201417 | For God so loved the world');
    expect(emdash.entries).toEqual([
      { reference: 'John 3:16\u201417', text: 'For God so loved the world', line: 1 },
    ]);
  });

  it('splits at the first dash that is not between digits', () => {
    const { entries } = parseVerseTextFile('Romans 12:1\u20132\u2014Therefore, I urge you');

    expect(entries).toEqual([
      { reference: 'Romans 12:1\u20132', text: 'Therefore, I urge you', line: 1 },
    ]);
  });

  it('reports a range-only line as unreadable rather than splitting inside the range', () => {
    const { entries, problems } = parseVerseTextFile('John 3:16\u201317');

    expect(entries).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(/no separator/i);
  });

  it('still treats a spaced en dash as a separator, digits or not', () => {
    const { entries } = parseVerseTextFile('Psalm 119:105 \u2013 Your word is a lamp');

    expect(entries).toEqual([
      { reference: 'Psalm 119:105', text: 'Your word is a lamp', line: 1 },
    ]);
  });

  it('treats a blank line as the end of an entry and continues text across lines', () => {
    const { entries, problems } = parseVerseTextFile(
      'John 3:16 - For God so loved the world,\nthat he gave his one and only Son.\n\nPsalm 23:1 - The LORD is my shepherd'
    );

    expect(problems).toEqual([]);
    expect(entries).toEqual([
      {
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his one and only Son.',
        line: 1,
      },
      { reference: 'Psalm 23:1', text: 'The LORD is my shepherd', line: 4 },
    ]);
  });

  it('starts a new entry on the next line that carries a separator, with no blank line needed', () => {
    const { entries } = parseVerseTextFile(
      'John 3:16 - For God so loved the world,\nthat he gave his one and only Son.\nPsalm 23:1 - The LORD is my shepherd'
    );

    expect(entries).toEqual([
      {
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his one and only Son.',
        line: 1,
      },
      { reference: 'Psalm 23:1', text: 'The LORD is my shepherd', line: 3 },
    ]);
  });

  it('does not split a verse in half at a dash in the middle of a continuation line', () => {
    const { entries } = parseVerseTextFile(
      'Isaiah 53:3 - He was despised and rejected by mankind,\na man of suffering - and we held him in low esteem.'
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe(
      'He was despised and rejected by mankind, a man of suffering - and we held him in low esteem.'
    );
  });

  it('still splits on a continuation line whose left half reads like a reference', () => {
    const { entries } = parseVerseTextFile(
      'Isaiah 53:3 - He was despised\nIsaiah 53:4 - Surely he took up our pain'
    );

    expect(entries.map((e) => e.reference)).toEqual(['Isaiah 53:3', 'Isaiah 53:4']);
  });

  it('does not apply the reference heuristic to the first line of an entry', () => {
    // No digit and well over the length limit, but there is nothing above it
    // for it to be a continuation of, so the separator is taken at its word.
    const { entries } = parseVerseTextFile(
      'A very long label with no numbers in it whatsoever - the text'
    );

    expect(entries).toEqual([
      {
        reference: 'A very long label with no numbers in it whatsoever',
        text: 'the text',
        line: 1,
      },
    ]);
  });

  it('reads a reference on its own line with the text underneath', () => {
    const { entries, problems } = parseVerseTextFile(
      'John 3:16\nFor God so loved the world,\nthat he gave his one and only Son.'
    );

    expect(problems).toEqual([]);
    expect(entries).toEqual([
      {
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his one and only Son.',
        line: 1,
      },
    ]);
  });

  it('collapses runs of whitespace in the verse text', () => {
    const { entries } = parseVerseTextFile('John 3:16 -   For   God\t so loved  ');

    expect(entries[0].text).toBe('For God so loved');
  });

  it('ignores comment lines without splitting the entry around them', () => {
    const { entries, problems } = parseVerseTextFile(
      '# Gospels\nJohn 3:16 - For God so loved\n  # a note mid-verse\nthe world'
    );

    expect(problems).toEqual([]);
    expect(entries).toEqual([
      { reference: 'John 3:16', text: 'For God so loved the world', line: 2 },
    ]);
  });

  it('tolerates CRLF line endings and a leading BOM', () => {
    const { entries, problems } = parseVerseTextFile(
      '﻿John 3:16 - For God so loved\r\n\r\nPsalm 23:1 - The LORD is my shepherd\r\n'
    );

    expect(problems).toEqual([]);
    expect(entries.map((e) => e.reference)).toEqual(['John 3:16', 'Psalm 23:1']);
    expect(entries.map((e) => e.line)).toEqual([1, 3]);
  });

  it('returns an empty result for an empty or whitespace-only file', () => {
    expect(parseVerseTextFile('')).toEqual({ entries: [], problems: [] });
    expect(parseVerseTextFile('\n  \n\t\n')).toEqual({ entries: [], problems: [] });
  });

  it('reports a lone line with no separator as a problem, and keeps parsing', () => {
    const { entries, problems } = parseVerseTextFile(
      'John 3:16 - For God so loved\n\nJust some stray text\n\nPsalm 23:1 - The LORD is my shepherd'
    );

    expect(entries.map((e) => e.reference)).toEqual(['John 3:16', 'Psalm 23:1']);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].excerpt).toBe('Just some stray text');
    expect(problems[0].message).toMatch(/no separator/i);
  });

  it('reports an entry with a separator but no text after it', () => {
    const { entries, problems } = parseVerseTextFile('John 3:16 - ');

    expect(entries).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('John 3:16');
  });

  it('reports an entry with no reference before the separator', () => {
    const { entries, problems } = parseVerseTextFile('| For God so loved the world');

    expect(entries).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(/missing reference/i);
  });

  it('truncates a long excerpt so the problem list stays readable', () => {
    const long = 'x'.repeat(200);
    const { problems } = parseVerseTextFile(long);

    expect(problems[0].excerpt).toHaveLength(61); // 60 characters plus the ellipsis
    expect(problems[0].excerpt.endsWith('…')).toBe(true);
  });
});

describe('planTextImport', () => {
  const existing: ExistingVerseKey[] = [{ reference: 'John 3:16', translation: 'NIV' }];

  const plan = (text: string, translation = 'NIV', library = existing) =>
    planTextImport(parseVerseTextFile(text), library, translation);

  it('imports everything when nothing clashes', () => {
    const result = plan('Psalm 23:1 - The LORD is my shepherd');

    expect(result.toImport.map((e) => e.reference)).toEqual(['Psalm 23:1']);
    expect(result.skipped).toEqual([]);
  });

  it('skips a verse already in the library, regardless of case and spacing', () => {
    const result = plan('john3:16 - For God so loved the world');

    expect(result.toImport).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('duplicate-existing');
    expect(result.skipped[0].entry.reference).toBe('john3:16');
  });

  it('keeps the same reference in a different translation', () => {
    const result = plan('John 3:16 - For God so loved the world', 'ESV');

    expect(result.toImport.map((e) => e.reference)).toEqual(['John 3:16']);
    expect(result.skipped).toEqual([]);
  });

  it('imports the first of a repeat within the file and skips the rest', () => {
    const result = plan(
      'Psalm 23:1 - The LORD is my shepherd\nPsalm 23:1 - a second copy\nPsalm 23:1 - a third copy'
    );

    expect(result.toImport.map((e) => e.text)).toEqual(['The LORD is my shepherd']);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.map((s) => s.reason)).toEqual(['duplicate-in-file', 'duplicate-in-file']);
  });

  it('distinguishes a clash with the library from a repeat within the file', () => {
    const result = plan('John 3:16 - one\nPsalm 23:1 - two\nPsalm 23:1 - three');

    expect(result.skipped.map((s) => s.reason)).toEqual([
      'duplicate-existing',
      'duplicate-in-file',
    ]);
  });

  it('carries parse problems through untouched', () => {
    const result = plan('Psalm 23:1 - The LORD is my shepherd\n\nstray');

    expect(result.problems).toHaveLength(1);
    expect(result.toImport).toHaveLength(1);
  });

  it('preserves file order in both lists', () => {
    const result = plan(
      'Psalm 1:1 - a\nJohn 3:16 - b\nPsalm 1:2 - c\nJohn 3:16 - d',
      'NIV'
    );

    expect(result.toImport.map((e) => e.reference)).toEqual(['Psalm 1:1', 'Psalm 1:2']);
    expect(result.skipped.map((s) => s.entry.line)).toEqual([2, 4]);
  });
});

describe('duplicateKey', () => {
  it('ignores case and whitespace on both halves', () => {
    expect(duplicateKey(' 1 John 3:16 ', 'niv')).toBe(duplicateKey('1JOHN3:16', ' NIV '));
  });

  it('does not let the reference and translation bleed into each other', () => {
    expect(duplicateKey('John 3', '16NIV')).not.toBe(duplicateKey('John 3:16', 'NIV'));
    expect(duplicateKey('John', '3:16NIV')).not.toBe(duplicateKey('John 3:16', 'NIV'));
  });
});
