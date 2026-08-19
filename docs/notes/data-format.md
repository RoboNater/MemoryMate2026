# Export/Import JSON Format

This is the file format produced by Settings -> Export and read by Settings ->
Import (`src/services/dataExportService.ts`; the validation rules below live in
`src/services/importValidation.ts`). It is a stable, versioned contract:
files a user already has on disk from an older version of the app must keep
importing correctly. If you change this format, bump `version` and keep the
importer accepting the older version(s) too.

Not to be confused with the plain-text verse import behind My Verses -> Import
(`docs/notes/text-import-format.md`), which bulk-adds verses from a typed list
and carries no ids, progress or history.

## Envelope

```json
{
  "version": 2,
  "exported_at": "2026-01-26T12:00:00.000Z",
  "app": "MemoryMate",
  "data": {
    "verses": [ /* ... */ ],
    "shelves": [ /* ... */ ],
    "progress": [ /* ... */ ],
    "test_results": [ /* ... */ ]
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `version` | `number` | Currently `2`. `1` is also still accepted on import. |
| `exported_at` | `string` (ISO 8601) | When the file was generated |
| `app` | `string` | Must be exactly `"MemoryMate"` |
| `data.verses` | `Verse[]` | Required, must be an array |
| `data.shelves` | `Shelf[]` | Optional (absent in version 1 files). When present, must be an array. |
| `data.progress` | `VerseProgress[]` | Required, must be an array |
| `data.test_results` | `TestResult[]` | Required, must be an array |

### Version history

- **1** — `verses` / `progress` / `test_results` only.
- **2** — adds `shelves` and `verses[].shelf_id`. A version-1 file still imports
  fine: `shelves` defaults to `[]` and every verse's `shelf_id` defaults to `null`.

## Record shapes

### Verse

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | |
| `reference` | `string` | non-empty |
| `text` | `string` | non-empty |
| `translation` | `string` | non-empty |
| `created_at` | `string` (ISO 8601, must round-trip through `new Date(x).toISOString() === x`) | |
| `archived` | `boolean` | |
| `shelf_id` | `string` (UUID) or `null` | optional field; absent is treated as `null` |

### Shelf

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | |
| `name` | `string` | non-empty after trim |
| `created_at` | `string` (ISO 8601) | |

### VerseProgress

| Field | Type | Notes |
|---|---|---|
| `verse_id` | `string` (UUID) | must reference a verse in the same file |
| `times_practiced` | `number` | integer, >= 0 |
| `times_tested` | `number` | integer, >= 0 |
| `times_correct` | `number` | integer, >= 0, and <= `times_tested` |
| `last_practiced` | `string` (ISO 8601) or `null` | |
| `last_tested` | `string` (ISO 8601) or `null` | |
| `comfort_level` | `number` | integer, 1-5 |

### TestResult

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | |
| `verse_id` | `string` (UUID) | must reference a verse in the same file |
| `timestamp` | `string` (ISO 8601) | |
| `passed` | `boolean` | |
| `score` | `number` or `null`/absent | 0.0-1.0 |

UUIDs are checked against the standard 8-4-4-4-12 hex pattern
(`isValidUUID` in `importValidation.ts`); ISO 8601 datetimes are checked by
round-tripping through `Date` and requiring an exact string match to
`toISOString()` — including `exported_at`. That is stricter than ISO 8601 in
general: an equivalent-instant spelling such as `...T12:00:00.000+00:00`, or one
without milliseconds, is rejected. Everything the app itself writes uses
`Date.toISOString()`, so this only affects hand-written or third-party files.

## Validation and tolerance behavior

Import validation is deliberately **tiered by how bad a bad record is**:

- **Envelope-level problems** (not JSON, wrong `app`, missing/non-array `verses`,
  `progress`, or `test_results`, or a `shelves` field present but not an array)
  fail the whole import immediately with an error message; nothing is written.
- **Verses are strict.** Every entry in `data.verses` must pass validation, and
  verse IDs must be unique within the file. A single invalid or duplicate verse
  fails the entire import — verses are treated as the anchor everything else
  depends on.
- **Shelves, progress, and test results are tolerant.** Each record is validated
  independently; an invalid record (bad shape, bad field, or a `progress`/
  `test_results` row whose `verse_id` doesn't match any verse in the file) is
  **skipped with a warning**, not treated as a failure. Duplicate shelf IDs and
  duplicate test-result IDs are likewise skipped with a warning rather than
  failing the import. A verse's `shelf_id` pointing at a shelf that isn't in the
  file (or wasn't valid) is imported as unshelved (`null`), with a warning.
- **The only outright failure conditions are:** invalid JSON, a failed envelope
  check, an invalid/duplicate verse, or **zero valid verses** in the file
  (`"No valid verses found in import file. Cannot import empty dataset."`). An
  empty-but-otherwise-valid `progress` or `test_results` array is fine.

`ImportResult` reports counts plus an optional `warnings: string[]` array so the
UI can show "Imported N verses, M warnings" rather than an all-or-nothing result.

## Import semantics: upsert, not replace

Import does **not** delete-then-reinsert. It upserts every record in the file
(`ON CONFLICT ... DO UPDATE`) and stamps every written row's `updated_at` to the
moment of import. Rows on the device that are *not* present in the file are
tombstoned (`deleted_at` set), not hard-deleted.

This matters specifically because the app also has cross-device sync
(`docs/architecture/sync.md`). A naive "clear tables, reinsert from backup" import
would hard-delete a verse to make room for the reinserted row — and because
`progress`/`test_results` have `ON DELETE CASCADE` foreign keys to `verses.id`,
that hard delete would cascade and silently destroy any tombstones already
recorded for that verse's children, before they had a chance to sync elsewhere.
Upserting the parent verse in place, instead of deleting and recreating it,
leaves those child tombstones untouched. After the transaction, the device's
sync watermarks are reset so the next sync fully re-pushes the imported state
(including new tombstones) and re-pulls the cloud.

Practically, this means: importing a backup is safe to run against a device that
has already synced with other devices, and both a restore of old data and a
divergence from what's currently on the device are handled — divergent local
rows the file doesn't mention are tombstoned (so the deletion propagates)
instead of silently kept.

## Example

```json
{
  "version": 2,
  "exported_at": "2026-08-01T09:15:00.000Z",
  "app": "MemoryMate",
  "data": {
    "verses": [
      {
        "id": "5b1f2b2e-2c3a-4a11-9c1a-0f1f6c8a1a11",
        "reference": "John 3:16",
        "text": "For God so loved the world, that he gave his only Son...",
        "translation": "ESV",
        "created_at": "2026-01-15T10:30:00.000Z",
        "archived": false,
        "shelf_id": "a2f3c4d5-6e7f-4890-9a1b-2c3d4e5f6071"
      }
    ],
    "shelves": [
      {
        "id": "a2f3c4d5-6e7f-4890-9a1b-2c3d4e5f6071",
        "name": "Gospel of John",
        "created_at": "2026-01-10T08:00:00.000Z"
      }
    ],
    "progress": [
      {
        "verse_id": "5b1f2b2e-2c3a-4a11-9c1a-0f1f6c8a1a11",
        "times_practiced": 5,
        "times_tested": 3,
        "times_correct": 2,
        "last_practiced": "2026-07-20T14:00:00.000Z",
        "last_tested": "2026-07-19T09:00:00.000Z",
        "comfort_level": 3
      }
    ],
    "test_results": [
      {
        "id": "d3e4f5a6-7b8c-4901-8a2b-3c4d5e6f7182",
        "verse_id": "5b1f2b2e-2c3a-4a11-9c1a-0f1f6c8a1a11",
        "timestamp": "2026-07-19T09:00:00.000Z",
        "passed": true,
        "score": 0.95
      }
    ]
  }
}
```
