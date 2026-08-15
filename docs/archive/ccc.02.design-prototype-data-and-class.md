# Prototype Data Model and Class Design

This document defines the data model and Python class design for the Memory Mate prototype.

## Data Model

### Verse

The core entity representing a Bible verse (or other memorizable text) that a user wants to memorize.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Unique identifier (UUID) |
| `reference` | `str` | The verse reference (e.g., "John 3:16", "Psalm 23:1") |
| `text` | `str` | The full text of the verse |
| `translation` | `str` | Bible translation (e.g., "NIV", "ESV", "KJV") |
| `created_at` | `datetime` | When the verse was added |
| `archived` | `bool` | Whether the verse is archived (hidden from active practice) |

### VerseProgress

Tracks a user's memorization progress for a specific verse.

| Field | Type | Description |
|-------|------|-------------|
| `verse_id` | `str` | Foreign key to Verse |
| `times_practiced` | `int` | Total number of practice sessions |
| `times_tested` | `int` | Total number of test attempts |
| `times_correct` | `int` | Number of successful test completions |
| `last_practiced` | `datetime` | When the verse was last practiced |
| `last_tested` | `datetime` | When the verse was last tested |
| `comfort_level` | `int` | Self-assessed comfort (1-5 scale) |

### TestResult

Individual test attempt record for detailed history tracking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Unique identifier (UUID) |
| `verse_id` | `str` | Foreign key to Verse |
| `timestamp` | `datetime` | When the test was taken |
| `passed` | `bool` | Whether the test was passed |
| `score` | `float` | Optional accuracy score (0.0-1.0) |
| `duration_seconds` | `int` | Time taken to complete |

## Entity Relationship

```
┌─────────────────┐       ┌──────────────────┐
│     Verse       │       │  VerseProgress   │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │──────<│ verse_id (FK)    │
│ reference       │       │ times_practiced  │
│ text            │       │ times_tested     │
│ translation     │       │ times_correct    │
│ created_at      │       │ last_practiced   │
│ archived        │       │ last_tested      │
└─────────────────┘       │ comfort_level    │
         │                └──────────────────┘
         │
         │                ┌──────────────────┐
         │                │   TestResult     │
         │                ├──────────────────┤
         └───────────────<│ id (PK)          │
                          │ verse_id (FK)    │
                          │ timestamp        │
                          │ passed           │
                          │ score            │
                          │ duration_seconds │
                          └──────────────────┘
```

## Python Class Design

### Class: `MemoryMateStore`

The main class that encapsulates all data operations for the prototype.

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid
import json


@dataclass
class Verse:
    """A memorizable verse or text."""
    id: str
    reference: str
    text: str
    translation: str = "NIV"
    created_at: datetime = field(default_factory=datetime.now)
    archived: bool = False


@dataclass
class VerseProgress:
    """Tracks memorization progress for a verse."""
    verse_id: str
    times_practiced: int = 0
    times_tested: int = 0
    times_correct: int = 0
    last_practiced: Optional[datetime] = None
    last_tested: Optional[datetime] = None
    comfort_level: int = 1  # 1-5 scale


@dataclass
class TestResult:
    """Individual test attempt record."""
    id: str
    verse_id: str
    timestamp: datetime
    passed: bool
    score: Optional[float] = None  # 0.0-1.0
    duration_seconds: Optional[int] = None


class MemoryMateStore:
    """
    Main data store for Memory Mate prototype.

    Provides methods to manage verses, track progress, and record test results.
    Data is persisted to a JSON file for simplicity.
    """

    def __init__(self, storage_path: str = "memory_mate_data.json"):
        """Initialize the store with optional custom storage path."""
        self._storage_path = storage_path
        self._verses: dict[str, Verse] = {}
        self._progress: dict[str, VerseProgress] = {}
        self._test_results: list[TestResult] = []
        self._load()

    # ========== Verse Management ==========

    def add_verse(self, reference: str, text: str, translation: str = "NIV") -> Verse:
        """Add a new verse to the collection."""
        pass

    def get_verse(self, verse_id: str) -> Optional[Verse]:
        """Retrieve a verse by ID."""
        pass

    def get_all_verses(self, include_archived: bool = False) -> list[Verse]:
        """Get all verses, optionally including archived ones."""
        pass

    def update_verse(self, verse_id: str, reference: str = None,
                     text: str = None, translation: str = None) -> Optional[Verse]:
        """Update verse fields. Only provided fields are updated."""
        pass

    def remove_verse(self, verse_id: str) -> bool:
        """Permanently delete a verse and its associated data."""
        pass

    def archive_verse(self, verse_id: str) -> bool:
        """Archive a verse (soft delete - hides from active practice)."""
        pass

    def unarchive_verse(self, verse_id: str) -> bool:
        """Restore an archived verse to active status."""
        pass

    # ========== Progress Tracking ==========

    def get_progress(self, verse_id: str) -> Optional[VerseProgress]:
        """Get progress data for a specific verse."""
        pass

    def record_practice(self, verse_id: str) -> bool:
        """Record that a verse was practiced."""
        pass

    def set_comfort_level(self, verse_id: str, level: int) -> bool:
        """Set the user's self-assessed comfort level (1-5)."""
        pass

    def reset_progress(self, verse_id: str) -> bool:
        """Reset all progress for a verse to initial state."""
        pass

    # ========== Test Results ==========

    def record_test_result(self, verse_id: str, passed: bool,
                           score: float = None, duration_seconds: int = None) -> TestResult:
        """Record a test attempt for a verse."""
        pass

    def get_test_history(self, verse_id: str = None, limit: int = None) -> list[TestResult]:
        """Get test history, optionally filtered by verse and limited."""
        pass

    # ========== Statistics ==========

    def get_stats(self) -> dict:
        """
        Get overall statistics.

        Returns dict with:
        - total_verses: int
        - active_verses: int
        - archived_verses: int
        - total_practices: int
        - total_tests: int
        - overall_accuracy: float (0.0-1.0)
        """
        pass

    def get_verse_stats(self, verse_id: str) -> Optional[dict]:
        """
        Get statistics for a specific verse.

        Returns dict with:
        - reference: str
        - times_practiced: int
        - times_tested: int
        - accuracy: float (0.0-1.0)
        - comfort_level: int
        - days_since_last_practice: int
        - days_since_last_test: int
        """
        pass

    # ========== Persistence ==========

    def _load(self) -> None:
        """Load data from storage file."""
        pass

    def _save(self) -> None:
        """Save data to storage file."""
        pass
```

## Method Specifications

### Verse Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `add_verse` | `reference`, `text`, `translation` | `Verse` | Creates new verse with generated UUID, initializes empty progress |
| `get_verse` | `verse_id` | `Verse` or `None` | Returns verse if found |
| `get_all_verses` | `include_archived` | `list[Verse]` | Returns all active verses, optionally including archived |
| `update_verse` | `verse_id`, optional fields | `Verse` or `None` | Updates only provided fields |
| `remove_verse` | `verse_id` | `bool` | Permanently deletes verse, progress, and test history |
| `archive_verse` | `verse_id` | `bool` | Sets `archived=True` |
| `unarchive_verse` | `verse_id` | `bool` | Sets `archived=False` |

### Progress Tracking

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `get_progress` | `verse_id` | `VerseProgress` or `None` | Returns progress data |
| `record_practice` | `verse_id` | `bool` | Increments `times_practiced`, updates `last_practiced` |
| `set_comfort_level` | `verse_id`, `level` (1-5) | `bool` | Validates and sets comfort level |
| `reset_progress` | `verse_id` | `bool` | Resets progress to initial values, clears test history |

### Test Results

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `record_test_result` | `verse_id`, `passed`, optional `score`, `duration_seconds` | `TestResult` | Creates result, updates progress counters |
| `get_test_history` | optional `verse_id`, `limit` | `list[TestResult]` | Returns test history, newest first |

## Storage Format

Data is persisted as JSON for simplicity and human readability:

```json
{
  "verses": {
    "uuid-1": {
      "id": "uuid-1",
      "reference": "John 3:16",
      "text": "For God so loved the world...",
      "translation": "NIV",
      "created_at": "2026-01-15T10:30:00",
      "archived": false
    }
  },
  "progress": {
    "uuid-1": {
      "verse_id": "uuid-1",
      "times_practiced": 5,
      "times_tested": 3,
      "times_correct": 2,
      "last_practiced": "2026-01-20T14:00:00",
      "last_tested": "2026-01-19T09:00:00",
      "comfort_level": 3
    }
  },
  "test_results": [
    {
      "id": "result-uuid-1",
      "verse_id": "uuid-1",
      "timestamp": "2026-01-19T09:00:00",
      "passed": true,
      "score": 0.95,
      "duration_seconds": 45
    }
  ]
}
```

## Design Decisions

### Why JSON Storage?
- Human-readable for debugging
- No external dependencies
- Easy to migrate to SQLite later
- Sufficient for single-user prototype

### Why Separate Progress from Verse?
- Clean separation of concerns
- Progress can be reset without affecting verse data
- Easier to extend with additional tracking fields

### Why Store Individual Test Results?
- Enables trend analysis and detailed history
- Supports future features (spaced repetition algorithms)
- Can be aggregated for summary statistics

### Comfort Level (1-5 Scale)
- 1: Just added / haven't started
- 2: Familiar with content, need lots of prompts
- 3: Can recall most of it with some help
- 4: Almost memorized, occasional mistakes
- 5: Fully memorized, confident

### VerseProgress Initialization: Lazy Creation (2026-01-04)

**Decision**: VerseProgress records are created lazily on first practice/test, not eagerly when a verse is added.

**Rationale**:
- Simpler implementation - avoids creating unused records
- No orphaned progress entries if verse is never practiced
- User can add verses without immediately creating progress overhead
- Progress can be explicitly initialized when needed via methods like `record_practice()`

**Implementation**:
- `add_verse()` does NOT create a VerseProgress record
- `get_progress()` returns `None` if progress doesn't exist
- `record_practice()`, `set_comfort_level()`, and similar methods create progress lazily if needed
- `reset_progress()` creates fresh progress if not yet initialized

### Cascade Delete for remove_verse

**Decision**: `remove_verse()` performs cascade delete - removes associated VerseProgress and TestResult records.

**Rationale**:
- Maintains data integrity per specification
- Prevents orphaned progress/test records
- User expectation: deleting a verse should remove all its data
- Simplifies the data model - no references to non-existent verses

**Implementation**:
- `remove_verse(verse_id)` deletes:
  1. The Verse record
  2. Associated VerseProgress (if exists)
  3. All TestResults for that verse_id
- Single operation ensures consistency

## Next Steps

1. Implement the `MemoryMateStore` class with all methods
2. Add unit tests for each method
3. Create a simple CLI for manual testing
4. Use the prototype to validate the data model before MVP implementation
