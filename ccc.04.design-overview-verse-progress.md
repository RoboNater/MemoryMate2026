# Design Overview: VerseProgress Implementation

**Created**: 2026-01-04
**Status**: Design specification for implementation

---

## Overview

This document specifies the implementation plan for `VerseProgress` functionality in the Memory Mate prototype. VerseProgress tracks a user's memorization journey for each verse, including practice sessions, comfort levels, and testing milestones.

---

## Use Cases

### 1. Track Practice Sessions
**User Story**: As a user, I want to track how many times I've practiced each verse so I can see my engagement over time.

**Workflow**:
1. User opens a verse to practice
2. User reads/recites the verse (no validation at this stage)
3. User marks practice as complete
4. System increments practice counter and records timestamp

**Data Changes**:
- `times_practiced` increments by 1
- `last_practiced` updates to current timestamp
- Progress record created lazily if first practice

### 2. Self-Assess Comfort Level
**User Story**: As a user, I want to rate my confidence with each verse so I can prioritize which ones need more work.

**Workflow**:
1. User completes a practice session
2. User sets comfort level (1-5 scale)
3. System records the self-assessment

**Comfort Scale**:
- **1**: Just added / haven't started
- **2**: Familiar with content, need lots of prompts
- **3**: Can recall most of it with some help
- **4**: Almost memorized, occasional mistakes
- **5**: Fully memorized, confident

**Data Changes**:
- `comfort_level` set to user's selection (1-5)
- Progress record created lazily if doesn't exist

### 3. Review Progress History
**User Story**: As a user, I want to see when I last practiced a verse so I know which ones I'm neglecting.

**Workflow**:
1. User views verse list or verse details
2. System displays progress metrics:
   - Total practice count
   - Days since last practice
   - Comfort level indicator
   - Test statistics (if tested)

**Data Retrieved**:
- All fields from `VerseProgress` record
- Computed: days since last practice/test

### 4. Reset Progress for Fresh Start
**User Story**: As a user, I want to reset my progress on a verse if I feel I need to start over.

**Workflow**:
1. User selects "Reset Progress" option for a verse
2. System confirms the action (in future UI)
3. System resets all progress counters to initial state
4. Test history cleared (cascade delete)

**Data Changes**:
- `times_practiced` = 0
- `times_tested` = 0
- `times_correct` = 0
- `last_practiced` = None
- `last_tested` = None
- `comfort_level` = 1
- All associated `TestResult` records deleted

---

## Data Model: VerseProgress

### Dataclass Definition

```python
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
```

### Field Specifications

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `verse_id` | `str` | (required) | Foreign key to Verse.id |
| `times_practiced` | `int` | 0 | Total practice sessions completed |
| `times_tested` | `int` | 0 | Total test attempts taken |
| `times_correct` | `int` | 0 | Number of tests passed |
| `last_practiced` | `datetime?` | None | Timestamp of most recent practice |
| `last_tested` | `datetime?` | None | Timestamp of most recent test |
| `comfort_level` | `int` | 1 | Self-assessed confidence (1-5) |

### Lazy Initialization Design

**Key Decision**: Progress records are created **on-demand**, not when verse is added.

**Why Lazy Initialization?**
- Simpler: No empty records for verses never practiced
- Efficient: No storage overhead for inactive verses
- Clean: User can add verses without triggering progress creation
- Flexible: Progress can be initialized when needed

**When Progress is Created**:
- First call to `record_practice(verse_id)`
- First call to `set_comfort_level(verse_id, level)`
- First call to `record_test_result(verse_id, ...)`
- Call to `reset_progress(verse_id)` (creates fresh record)

**When Progress Does NOT Exist**:
- `get_progress(verse_id)` returns `None`
- Verse exists but has never been practiced/tested

### Serialization Format

Progress records stored in JSON under `"progress"` key, keyed by `verse_id`:

```json
{
  "verses": { ... },
  "progress": {
    "verse-uuid-1": {
      "verse_id": "verse-uuid-1",
      "times_practiced": 5,
      "times_tested": 3,
      "times_correct": 2,
      "last_practiced": "2026-01-20T14:30:00",
      "last_tested": "2026-01-19T09:15:00",
      "comfort_level": 3
    }
  }
}
```

---

## Methods: VerseProgress API

### 1. `get_progress(verse_id: str) -> Optional[VerseProgress]`

**Purpose**: Retrieve progress data for a specific verse.

**Parameters**:
- `verse_id`: The verse to query

**Returns**:
- `VerseProgress` object if progress exists
- `None` if verse has no progress record (never practiced)

**Behavior**:
- Does NOT validate if verse exists (returns None for non-existent verses)
- Does NOT create progress lazily (read-only operation)

**Example**:
```python
progress = store.get_progress(verse.id)
if progress:
    print(f"Practiced {progress.times_practiced} times")
else:
    print("Not yet practiced")
```

---

### 2. `record_practice(verse_id: str) -> bool`

**Purpose**: Record that a verse was practiced.

**Parameters**:
- `verse_id`: The verse that was practiced

**Returns**:
- `True` if successfully recorded
- `False` if verse doesn't exist

**Behavior**:
1. Validate verse exists
2. Create progress record lazily if needed
3. Increment `times_practiced` by 1
4. Set `last_practiced` to current timestamp
5. Save to persistent storage

**Side Effects**:
- Creates `VerseProgress` on first practice
- Mutates existing progress record
- Triggers `_save()`

**Example**:
```python
# First practice ever
store.record_practice(verse.id)  # Creates progress, times_practiced=1

# Subsequent practices
store.record_practice(verse.id)  # Increments to 2, 3, etc.
```

---

### 3. `set_comfort_level(verse_id: str, level: int) -> bool`

**Purpose**: Set user's self-assessed comfort level (1-5).

**Parameters**:
- `verse_id`: The verse to update
- `level`: Comfort rating (1-5)

**Returns**:
- `True` if successfully set
- `False` if verse doesn't exist or level is invalid

**Validation**:
- Verse must exist
- Level must be integer in range [1, 5]

**Behavior**:
1. Validate verse exists
2. Validate level is 1-5
3. Create progress record lazily if needed
4. Set `comfort_level` to the provided value
5. Save to persistent storage

**Side Effects**:
- Creates `VerseProgress` if setting comfort on unpracticed verse
- Mutates existing progress record
- Triggers `_save()`

**Example**:
```python
# Set comfort after practice
store.set_comfort_level(verse.id, 3)  # "Can recall most of it"

# Update comfort over time
store.set_comfort_level(verse.id, 4)  # "Almost memorized"
store.set_comfort_level(verse.id, 5)  # "Fully memorized"

# Invalid levels
store.set_comfort_level(verse.id, 0)   # Returns False
store.set_comfort_level(verse.id, 6)   # Returns False
```

---

### 4. `reset_progress(verse_id: str) -> bool`

**Purpose**: Reset all progress for a verse to initial state.

**Parameters**:
- `verse_id`: The verse to reset

**Returns**:
- `True` if successfully reset
- `False` if verse doesn't exist

**Behavior**:
1. Validate verse exists
2. Create fresh `VerseProgress` with default values
3. Delete all associated `TestResult` records (cascade)
4. Save to persistent storage

**Side Effects**:
- Overwrites existing progress (if any)
- Creates new progress record (even if none existed)
- Deletes all test history for this verse
- Triggers `_save()`

**Initial State**:
```python
VerseProgress(
    verse_id=verse_id,
    times_practiced=0,
    times_tested=0,
    times_correct=0,
    last_practiced=None,
    last_tested=None,
    comfort_level=1
)
```

**Example**:
```python
# Reset after feeling like starting over
store.reset_progress(verse.id)

# All counters back to zero
progress = store.get_progress(verse.id)
assert progress.times_practiced == 0
assert progress.comfort_level == 1
```

---

## Internal Implementation Details

### Helper Method: `_ensure_progress(verse_id: str) -> Optional[VerseProgress]`

**Purpose**: Internal helper to ensure progress record exists (lazy creation).

**Returns**:
- Existing `VerseProgress` if already created
- New `VerseProgress` if verse exists but no progress
- `None` if verse doesn't exist

**Used by**:
- `record_practice()`
- `set_comfort_level()`
- `record_test_result()` (future implementation)

**Example Implementation**:
```python
def _ensure_progress(self, verse_id: str) -> Optional[VerseProgress]:
    """Ensure progress record exists for a verse (lazy creation)."""
    if verse_id not in self._verses:
        return None

    if verse_id not in self._progress:
        self._progress[verse_id] = VerseProgress(verse_id=verse_id)

    return self._progress[verse_id]
```

### Serialization Methods

Add to `VerseProgress` dataclass:

```python
def to_dict(self) -> dict:
    """Convert progress to dictionary for JSON serialization."""
    return {
        'verse_id': self.verse_id,
        'times_practiced': self.times_practiced,
        'times_tested': self.times_tested,
        'times_correct': self.times_correct,
        'last_practiced': self.last_practiced.isoformat() if self.last_practiced else None,
        'last_tested': self.last_tested.isoformat() if self.last_tested else None,
        'comfort_level': self.comfort_level
    }

@staticmethod
def from_dict(data: dict) -> 'VerseProgress':
    """Create VerseProgress from dictionary (JSON deserialization)."""
    return VerseProgress(
        verse_id=data['verse_id'],
        times_practiced=data.get('times_practiced', 0),
        times_tested=data.get('times_tested', 0),
        times_correct=data.get('times_correct', 0),
        last_practiced=datetime.fromisoformat(data['last_practiced']) if data.get('last_practiced') else None,
        last_tested=datetime.fromisoformat(data['last_tested']) if data.get('last_tested') else None,
        comfort_level=data.get('comfort_level', 1)
    )
```

### Updates to `_load()` and `_save()`

**_load() additions**:
```python
# Load progress (in _load method)
progress_data = data.get('progress', {})
for verse_id, progress_dict in progress_data.items():
    self._progress[verse_id] = VerseProgress.from_dict(progress_dict)
```

**_save() additions**:
```python
# Save progress (in _save method)
data = {
    'verses': {verse_id: verse.to_dict() for verse_id, verse in self._verses.items()},
    'progress': {verse_id: prog.to_dict() for verse_id, prog in self._progress.items()}
}
```

---

## Edge Cases and Error Handling

### 1. Progress for Non-Existent Verse
**Scenario**: User calls `record_practice()` or `set_comfort_level()` with invalid verse_id

**Behavior**: Return `False` without creating progress

**Rationale**: Prevent orphaned progress records

### 2. Invalid Comfort Level
**Scenario**: User calls `set_comfort_level(verse_id, 0)` or `set_comfort_level(verse_id, 10)`

**Behavior**: Return `False`, do not modify progress

**Rationale**: Maintain data integrity with 1-5 scale

### 3. Reset Progress Without Prior Progress
**Scenario**: User calls `reset_progress()` on unpracticed verse

**Behavior**: Create fresh progress record (all zeros, comfort=1)

**Rationale**: User expectation - "reset" should ensure clean slate exists

### 4. Get Progress on Unpracticed Verse
**Scenario**: User calls `get_progress()` on verse never practiced

**Behavior**: Return `None`

**Rationale**: Distinguish between "no progress" and "zero progress" - UI can show different states

---

## Testing Strategy

### Unit Tests to Implement

1. **get_progress()**
   - Returns None for unpracticed verse
   - Returns None for non-existent verse
   - Returns correct progress for practiced verse

2. **record_practice()**
   - Creates progress on first practice (lazy init)
   - Increments counter on subsequent practices
   - Updates timestamp correctly
   - Returns False for non-existent verse
   - Persists to storage

3. **set_comfort_level()**
   - Sets level correctly (1-5)
   - Creates progress if needed (lazy init)
   - Rejects invalid levels (0, 6, -1, etc.)
   - Returns False for non-existent verse
   - Persists to storage

4. **reset_progress()**
   - Resets all counters to zero
   - Resets comfort to 1
   - Clears timestamps
   - Creates progress if none existed
   - Cascades to delete test results (when implemented)
   - Returns False for non-existent verse
   - Persists to storage

5. **Integration Tests**
   - Practice → Check → Practice again
   - Set comfort on unpracticed verse
   - Reset progress → Verify test results deleted
   - Load from JSON → Progress preserved

6. **Persistence Tests**
   - Save/load cycle preserves progress
   - Null timestamps handled correctly
   - Progress dict keyed by verse_id

---

## Implementation Order

1. **Add `VerseProgress` dataclass** to [memory_mate.py](memory_mate.py)
   - Include `to_dict()` and `from_dict()` methods

2. **Update `_load()` method**
   - Load progress from JSON

3. **Update `_save()` method**
   - Save progress to JSON

4. **Implement `_ensure_progress()` helper**
   - Internal lazy creation logic

5. **Implement `get_progress()`**
   - Simple dictionary lookup

6. **Implement `record_practice()`**
   - Use `_ensure_progress()` helper
   - Increment counter, update timestamp

7. **Implement `set_comfort_level()`**
   - Validation logic
   - Use `_ensure_progress()` helper

8. **Implement `reset_progress()`**
   - Create fresh progress
   - Cascade delete test results (stub for now)

9. **Add unit tests** to [test_memory_mate.py](test_memory_mate.py)
   - Follow existing test structure
   - Aim for 95%+ coverage

10. **Update demo script** [demo_memory_mate.py](demo_memory_mate.py)
    - Showcase progress tracking features

---

## Integration with Future TestResult

When `TestResult` is implemented, the following methods will update progress:

**`record_test_result(verse_id, passed, score, duration_seconds)`**:
- Increments `times_tested`
- Increments `times_correct` if `passed == True`
- Updates `last_tested` timestamp
- Uses `_ensure_progress()` to create progress lazily

**`reset_progress(verse_id)`**:
- Deletes all `TestResult` records where `verse_id` matches (cascade delete)

---

## Open Questions

None at this time. Design aligns with existing architecture and decisions documented in:
- [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md)
- [ccc.00.active-context.md](ccc.00.active-context.md) (lazy creation, cascade delete decisions)

---

## References

- **Data Model Spec**: [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md)
- **Design Decisions**: [ccc.00.active-context.md](ccc.00.active-context.md) (lines 23-32)
- **Current Implementation**: [memory_mate.py](memory_mate.py)
- **Existing Tests**: [test_memory_mate.py](test_memory_mate.py)

---

**Next Step**: Begin implementation following the order specified above.
