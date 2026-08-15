import {
  validateExportFormat,
  validateVerse,
  validateShelf,
  validateProgress,
  validateTestResult,
} from '../importValidation';

const VERSE_ID = '11111111-1111-1111-1111-111111111111';
const SHELF_ID = '22222222-2222-2222-2222-222222222222';
const RESULT_ID = '33333333-3333-3333-3333-333333333333';
const OTHER_VERSE_ID = '99999999-9999-9999-9999-999999999999';

function validVerse() {
  return {
    id: VERSE_ID,
    reference: 'John 3:16',
    text: 'For God so loved the world',
    translation: 'ESV',
    created_at: '2026-01-01T00:00:00.000Z',
    archived: false,
    shelf_id: null,
  };
}

function validShelf() {
  return { id: SHELF_ID, name: 'Favorites', created_at: '2026-01-01T00:00:00.000Z' };
}

function validProgress() {
  return {
    verse_id: VERSE_ID,
    times_practiced: 5,
    times_tested: 3,
    times_correct: 2,
    last_practiced: '2026-01-02T00:00:00.000Z',
    last_tested: '2026-01-02T00:00:00.000Z',
    comfort_level: 3,
  };
}

function validTestResult() {
  return {
    id: RESULT_ID,
    verse_id: VERSE_ID,
    timestamp: '2026-01-02T00:00:00.000Z',
    passed: true,
    score: 0.8,
  };
}

function validExportFile() {
  return {
    version: 2,
    exported_at: '2026-01-01T00:00:00.000Z',
    app: 'MemoryMate',
    data: {
      verses: [validVerse()],
      shelves: [validShelf()],
      progress: [validProgress()],
      test_results: [validTestResult()],
    },
  };
}

describe('validateExportFormat', () => {
  it('never throws, even on wildly malformed input, and rejects null/non-object/string', () => {
    expect(() => validateExportFormat(null)).not.toThrow();
    expect(() => validateExportFormat('not json data')).not.toThrow();
    expect(() => validateExportFormat([1, 2, 3])).not.toThrow();
    expect(validateExportFormat(null).valid).toBe(false);
    expect(validateExportFormat(42).valid).toBe(false);
    expect(validateExportFormat('nope').valid).toBe(false);
  });

  it('rejects a file missing the data field entirely', () => {
    const file = { version: 1, app: 'MemoryMate', exported_at: '2026-01-01T00:00:00.000Z' };
    const result = validateExportFormat(file);
    expect(result).toEqual({ valid: false, errors: ['Missing or invalid data field'] });
  });

  it('rejects the wrong app value', () => {
    const result = validateExportFormat({ ...validExportFile(), app: 'SomeOtherApp' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Expected app "MemoryMate"'))).toBe(true);
  });

  it.each([
    [1, true],
    [2, true],
    [3, false],
  ])('version %i is valid=%p', (version, expectedValid) => {
    expect(validateExportFormat({ ...validExportFile(), version }).valid).toBe(expectedValid);
  });

  it.each([
    ['verses', 'not-an-array', 'Missing or invalid verses array'],
    ['progress', {}, 'Missing or invalid progress array'],
    ['test_results', null, 'Missing or invalid test_results array'],
  ])('rejects a missing/non-array %s field', (field, badValue, expectedError) => {
    const file = validExportFile();
    (file.data as any)[field] = badValue;
    const result = validateExportFormat(file);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it('accepts shelves entirely absent (version-1-style files) but rejects shelves present and non-array', () => {
    const withoutShelves = validExportFile();
    delete (withoutShelves.data as any).shelves;
    expect(validateExportFormat(withoutShelves).valid).toBe(true);

    const badShelves = { ...validExportFile(), data: { ...validExportFile().data, shelves: 'nope' } };
    const result = validateExportFormat(badShelves);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid shelves field (must be an array when present)');
  });

  it('accumulates MULTIPLE errors in one pass rather than stopping at the first', () => {
    const file = {
      version: 99,
      app: 'NotMemoryMate',
      exported_at: 12345,
      data: { verses: 'nope', shelves: 'nope', progress: 'nope', test_results: 'nope' },
    };
    const result = validateExportFormat(file);
    expect(result.errors.length).toBeGreaterThanOrEqual(6);
  });
});

describe('validateVerse', () => {
  it('accepts a valid verse', () => {
    expect(validateVerse(validVerse())).toBeNull();
  });

  it.each([
    ['id', undefined, /id/],
    ['id', 'not-a-uuid', /Invalid UUID format/],
    ['reference', undefined, /reference/],
    ['text', undefined, /text/],
    ['translation', undefined, /translation/],
    ['created_at', 'yesterday', /created_at/],
    ['archived', 'false', /archived/],
    ['shelf_id', 'not-a-uuid', /shelf_id/],
  ])('rejects a bad %s field', (field, badValue, expectedMessage) => {
    const v: any = validVerse();
    if (badValue === undefined) delete v[field];
    else v[field] = badValue;
    expect(validateVerse(v)).toMatch(expectedMessage);
  });

  it.each([[null], [undefined]])('accepts a %s shelf_id (unshelved)', (shelfId) => {
    const v: any = validVerse();
    if (shelfId === undefined) delete v.shelf_id;
    else v.shelf_id = shelfId;
    expect(validateVerse(v)).toBeNull();
  });

  it('never throws on nasty input', () => {
    expect(() => validateVerse(null)).not.toThrow();
    expect(() => validateVerse([1, 2, 3])).not.toThrow();
    expect(validateVerse(null)).toMatch(/not an object/);
  });
});

describe('validateShelf', () => {
  it('accepts a valid shelf and never throws on garbage', () => {
    expect(validateShelf(validShelf())).toBeNull();
    expect(() => validateShelf(undefined)).not.toThrow();
    expect(validateShelf(undefined)).toMatch(/not an object/);
  });
});

describe('validateProgress', () => {
  const verseIds = new Set([VERSE_ID]);

  it('accepts a valid progress record', () => {
    expect(validateProgress(validProgress(), verseIds)).toBeNull();
  });

  it.each([
    [0, false],
    [1, true],
    [5, true],
    [6, false],
    [2.5, false],
  ])('comfort_level %p is valid=%p', (comfort_level, expectedValid) => {
    const result = validateProgress({ ...validProgress(), comfort_level }, verseIds);
    expect(result === null).toBe(expectedValid);
  });

  it.each(['times_practiced', 'times_tested', 'times_correct'])(
    'rejects a negative %s',
    (field) => {
      const p: any = { ...validProgress(), [field]: -1 };
      expect(validateProgress(p, verseIds)).toMatch(new RegExp(field));
    }
  );

  it('rejects times_correct > times_tested', () => {
    const p = { ...validProgress(), times_tested: 2, times_correct: 5 };
    expect(validateProgress(p, verseIds)).toMatch(/cannot exceed/);
  });

  it.each(['last_practiced', 'last_tested'])(
    'accepts a null %s but rejects a malformed one',
    (field) => {
      expect(validateProgress({ ...validProgress(), [field]: null }, verseIds)).toBeNull();
      expect(
        validateProgress({ ...validProgress(), [field]: 'not-a-date' }, verseIds)
      ).toMatch(new RegExp(field));
    }
  );

  it('rejects a verse_id not present in the provided verse-id Set', () => {
    const p = { ...validProgress(), verse_id: OTHER_VERSE_ID };
    expect(validateProgress(p, verseIds)).toMatch(/non-existent verse/);
  });

  it('never throws on nasty input', () => {
    expect(() => validateProgress(null, verseIds)).not.toThrow();
    expect(() => validateProgress('garbage', verseIds)).not.toThrow();
    expect(() => validateProgress({ verse_id: {} }, verseIds)).not.toThrow();
  });
});

describe('validateTestResult', () => {
  const verseIds = new Set([VERSE_ID]);

  it('accepts a valid test result', () => {
    expect(validateTestResult(validTestResult(), verseIds)).toBeNull();
  });

  it.each([
    [-0.1, false],
    [1.1, false],
    [0, true],
    [1, true],
    [null, true],
    [undefined, true],
  ])('score %p is valid=%p', (score, expectedValid) => {
    const r: any = validTestResult();
    if (score === undefined) delete r.score;
    else r.score = score;
    expect(validateTestResult(r, verseIds) === null).toBe(expectedValid);
  });

  it('rejects a non-boolean passed field', () => {
    const r = { ...validTestResult(), passed: 'yes' as any };
    expect(validateTestResult(r, verseIds)).toMatch(/passed/);
  });

  it('rejects a dangling verse_id', () => {
    const r = { ...validTestResult(), verse_id: OTHER_VERSE_ID };
    expect(validateTestResult(r, verseIds)).toMatch(/non-existent verse/);
  });

  it('never throws on nasty input', () => {
    expect(() => validateTestResult(undefined, verseIds)).not.toThrow();
    expect(() => validateTestResult({ id: 1, verse_id: [] }, verseIds)).not.toThrow();
    expect(() => validateTestResult(NaN, verseIds)).not.toThrow();
  });
});
