# Design Overview: TestResult Implementation

**Created**: 2026-01-05
**Status**: Design specification for implementation

---

## Overview

This document specifies the implementation plan for `TestResult` functionality in the Memory Mate prototype. TestResult records individual test attempts for verses, enabling history tracking and statistical insights into memorization progress.

---

## Use Cases

### 1. Record Test Attempt
**User Story**: As a user, I want to record each time I test myself on a verse so I can track my progress over time.

**Workflow**:
1. User initiates a test on a specific verse
2. User attempts to recite/type the verse from memory
3. System evaluates performance (passed/failed, optional score)
4. System records the attempt with timestamp
5. System updates VerseProgress counters automatically

**Data Changes**:
- New `TestResult` record created with unique ID
- `timestamp` set to current time
- `passed` indicates success/failure
- Optional `score` (0.0-1.0) for accuracy measurement
- VerseProgress updates:
  - `times_tested` increments by 1
  - `times_correct` increments if `passed == True`
  - `last_tested` updates to current timestamp

**Example Scenarios**:
- **Full pass**: User recites verse perfectly → `passed=True`, `score=1.0`
- **Partial accuracy**: User gets 90% correct → `passed=True`, `score=0.90`
- **Failed attempt**: User makes too many mistakes → `passed=False`, `score=0.45`
- **Simple pass/fail**: Just record outcome → `passed=True`, `score=None`

### 2. Review Test History
**User Story**: As a user, I want to see my test history for a verse so I can review my past attempts.

**Workflow**:
1. User views a verse's detail page
2. System displays recent test attempts (chronologically)
3. User sees pass/fail status, scores, and dates

**Data Retrieved**:
- List of `TestResult` records for the verse
- Sorted by `timestamp` (newest first)
- Optionally limited to recent N attempts

**Example Display**:
```
Test History for "John 3:16"
- 2026-01-05 14:30 ✓ Pass (95%)
- 2026-01-04 09:15 ✓ Pass (88%)
- 2026-01-03 16:20 ✗ Fail (65%)
- 2026-01-02 11:00 ✓ Pass (92%)
```

### 3. Analyze Overall Test Performance
**User Story**: As a user, I want to see my overall testing statistics across all verses.

**Workflow**:
1. User opens statistics/dashboard page
2. System aggregates all test results
3. Displays metrics like:
   - Total tests taken
   - Overall pass rate
   - Average score

**Data Retrieved**:
- All `TestResult` records across all verses
- Aggregated metrics computed from test results
- Combined with VerseProgress data for complete picture

---

## Data Model: TestResult

### Dataclass Definition

```python
@dataclass
class TestResult:
    """Individual test attempt record."""
    id: str
    verse_id: str
    timestamp: datetime
    passed: bool
    score: Optional[float] = None  # 0.0-1.0
```

### Field Specifications

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | (required) | Unique identifier (UUID) for the test result |
| `verse_id` | `str` | (required) | Foreign key to Verse.id |
| `timestamp` | `datetime` | (required) | When the test was taken |
| `passed` | `bool` | (required) | Whether the test was passed |
| `score` | `float?` | None | Optional accuracy score (0.0 = 0%, 1.0 = 100%) |

### Field Validation

**`score` validation**:
- Must be float in range [0.0, 1.0] if provided
- `None` is valid (indicates simple pass/fail tracking)
- Implementation should validate on creation

**`passed` vs `score` relationship**:
- Not strictly enforced in data model (allows flexibility)
- Typical convention:
  - `passed=True` usually has `score >= 0.7`
  - `passed=False` usually has `score < 0.7`
- But user can define their own threshold

### Serialization Format

Test results stored in JSON as a list under `"test_results"` key:

```json
{
  "verses": { ... },
  "progress": { ... },
  "test_results": [
    {
      "id": "result-uuid-1",
      "verse_id": "verse-uuid-1",
      "timestamp": "2026-01-05T14:30:00",
      "passed": true,
      "score": 0.95
    },
    {
      "id": "result-uuid-2",
      "verse_id": "verse-uuid-1",
      "timestamp": "2026-01-04T09:15:00",
      "passed": true,
      "score": 0.88
    },
    {
      "id": "result-uuid-3",
      "verse_id": "verse-uuid-2",
      "timestamp": "2026-01-05T11:00:00",
      "passed": false,
      "score": null
    }
  ]
}
```

---

## Methods: TestResult API

### 1. `record_test_result(verse_id: str, passed: bool, score: Optional[float] = None) -> Optional[TestResult]`

**Purpose**: Record a test attempt for a verse.

**Parameters**:
- `verse_id`: The verse being tested
- `passed`: Whether the test was passed
- `score`: Optional accuracy score (0.0-1.0)

**Returns**:
- `TestResult` object if successfully recorded
- `None` if verse doesn't exist or validation fails

**Validation**:
- Verse must exist
- If `score` provided, must be float in [0.0, 1.0]

**Behavior**:
1. Validate verse exists
2. Validate optional parameters (score range)
3. Create new `TestResult` with generated UUID
4. Set `timestamp` to current time
5. Append to `_test_results` list
6. Update VerseProgress (via `_ensure_progress()`):
   - Increment `times_tested`
   - Increment `times_correct` if `passed == True`
   - Update `last_tested` timestamp
7. Save to persistent storage

**Side Effects**:
- Creates `TestResult` record
- Mutates `VerseProgress` (creates lazily if needed)
- Triggers `_save()`

**Example**:
```python
# Record test with score
result = store.record_test_result(verse.id, passed=True, score=0.95)
assert result.passed is True
assert result.score == 0.95

# Simple pass/fail tracking
result = store.record_test_result(verse.id, passed=False)
assert result.score is None

# Invalid score rejected
result = store.record_test_result(verse.id, passed=True, score=1.5)
assert result is None  # Validation failed
```

---

### 2. `get_test_history(verse_id: Optional[str] = None, limit: Optional[int] = None) -> list[TestResult]`

**Purpose**: Retrieve test history, optionally filtered by verse and limited in quantity.

**Parameters**:
- `verse_id`: Optional filter to get results for specific verse only
- `limit`: Optional maximum number of results to return (most recent first)

**Returns**:
- List of `TestResult` objects sorted by timestamp (newest first)
- Empty list if no results match criteria

**Behavior**:
1. Start with all test results
2. If `verse_id` provided, filter to that verse only
3. Sort by `timestamp` descending (newest first)
4. If `limit` provided, take first N results
5. Return the filtered and sorted list

**Use Cases**:
- `get_test_history()` - All test results, newest first
- `get_test_history(verse_id=v1)` - All tests for specific verse
- `get_test_history(limit=10)` - 10 most recent tests across all verses
- `get_test_history(verse_id=v1, limit=5)` - 5 most recent tests for specific verse

**Example**:
```python
# Get all test history for a verse
history = store.get_test_history(verse_id=verse.id)
for result in history:
    print(f"{result.timestamp}: {'Pass' if result.passed else 'Fail'}")

# Get 10 most recent tests across all verses
recent = store.get_test_history(limit=10)

# Get last 5 tests for a specific verse
recent_verse = store.get_test_history(verse_id=verse.id, limit=5)
```

---

## Internal Implementation Details

### Dataclass Serialization Methods

Add to `TestResult` dataclass:

```python
def to_dict(self) -> dict:
    """Convert test result to dictionary for JSON serialization."""
    return {
        'id': self.id,
        'verse_id': self.verse_id,
        'timestamp': self.timestamp.isoformat(),
        'passed': self.passed,
        'score': self.score
    }

@staticmethod
def from_dict(data: dict) -> 'TestResult':
    """Create TestResult from dictionary (JSON deserialization)."""
    return TestResult(
        id=data['id'],
        verse_id=data['verse_id'],
        timestamp=datetime.fromisoformat(data['timestamp']),
        passed=data['passed'],
        score=data.get('score')
    )
```

### Updates to `_load()` and `_save()`

**_load() additions**:
```python
# Load test results (in _load method)
test_results_data = data.get('test_results', [])
for result_dict in test_results_data:
    self._test_results.append(TestResult.from_dict(result_dict))
```

**_save() additions**:
```python
# Save test results (in _save method)
data = {
    'verses': {verse_id: verse.to_dict() for verse_id, verse in self._verses.items()},
    'progress': {verse_id: prog.to_dict() for verse_id, prog in self._progress.items()},
    'test_results': [tr.to_dict() for tr in self._test_results]
}
```

### Integration with VerseProgress

The `record_test_result()` method automatically updates VerseProgress:

```python
def record_test_result(self, verse_id: str, passed: bool,
                       score: Optional[float] = None) -> Optional[TestResult]:
    # Validate verse exists
    if verse_id not in self._verses:
        return None

    # Validate score if provided
    if score is not None:
        if not isinstance(score, (int, float)) or score < 0.0 or score > 1.0:
            return None

    # Create test result
    result = TestResult(
        id=str(uuid.uuid4()),
        verse_id=verse_id,
        timestamp=datetime.now(),
        passed=passed,
        score=score
    )

    # Add to results list
    self._test_results.append(result)

    # Update progress (creates lazily if needed)
    progress = self._ensure_progress(verse_id)
    if progress:
        progress.times_tested += 1
        if passed:
            progress.times_correct += 1
        progress.last_tested = result.timestamp

    self._save()
    return result
```

---

## Edge Cases and Error Handling

### 1. Test Result for Non-Existent Verse
**Scenario**: User calls `record_test_result()` with invalid verse_id

**Behavior**: Return `None` without creating result

**Rationale**: Prevent orphaned test results referencing non-existent verses

### 2. Invalid Score Value
**Scenario**: User calls `record_test_result(verse_id, True, score=1.5)` or `score=-0.2`

**Behavior**: Return `None`, do not create result

**Rationale**: Maintain data integrity with 0.0-1.0 score range

### 3. Get History for Non-Existent Verse
**Scenario**: User calls `get_test_history(verse_id="invalid-id")`

**Behavior**: Return empty list `[]`

**Rationale**: No validation needed - just filtering results

### 4. Limit Greater Than Available Results
**Scenario**: User calls `get_test_history(limit=100)` but only 10 results exist

**Behavior**: Return all 10 results

**Rationale**: Limit is a maximum, not a requirement

### 5. Test Result Created Before VerseProgress
**Scenario**: First interaction with verse is a test (no prior practice)

**Behavior**: `_ensure_progress()` creates VerseProgress lazily, then updates counters

**Rationale**: Consistent lazy initialization pattern

### 6. Cascade Delete When Verse Removed
**Scenario**: User calls `remove_verse(verse_id)` - what happens to test results?

**Behavior**: All test results for that verse are deleted (already implemented in `remove_verse()`)

**Rationale**: Maintain referential integrity, prevent orphaned data

### 7. Cascade Delete When Progress Reset
**Scenario**: User calls `reset_progress(verse_id)` - what happens to test results?

**Behavior**: All test results for that verse are deleted (already implemented in `reset_progress()`)

**Rationale**: "Reset" implies clean slate, including test history

---

## Testing Strategy

### Unit Tests to Implement

1. **TestResult Dataclass**
   - Create with all fields
   - Create with optional score as None
   - Serialize to dict with `to_dict()`
   - Deserialize from dict with `from_dict()`
   - Handle None score in serialization

2. **record_test_result()**
   - Creates result with score
   - Creates result without score (pass/fail only)
   - Generates unique UUID for each result
   - Sets timestamp automatically
   - Validates verse exists (returns None for invalid)
   - Validates score range (rejects < 0.0 or > 1.0)
   - Updates VerseProgress counters correctly
   - Increments times_tested
   - Increments times_correct only on pass
   - Updates last_tested timestamp
   - Creates VerseProgress lazily if needed
   - Persists to storage

3. **get_test_history()**
   - Returns empty list when no results
   - Returns all results when no filter
   - Filters by verse_id correctly
   - Sorts by timestamp descending (newest first)
   - Respects limit parameter
   - Combines verse_id filter and limit
   - Returns empty list for non-existent verse_id

4. **Integration with VerseProgress**
   - First test creates progress record
   - Subsequent tests update existing progress
   - Failed test increments times_tested but not times_correct
   - Passed test increments both counters
   - Multiple tests update counters correctly

5. **Cascade Delete Tests**
   - remove_verse() deletes associated test results
   - reset_progress() deletes test history
   - No orphaned results after operations

6. **Persistence Tests**
   - Save/load cycle preserves test results
   - Multiple results stored as list
   - Timestamps serialized/deserialized correctly
   - None score handled correctly

---

## Implementation Order

1. **Add `TestResult` dataclass** to [memory_mate.py](memory_mate.py)
   - Include `to_dict()` and `from_dict()` methods
   - Add type hints properly

2. **Update `_load()` method**
   - Load test_results from JSON

3. **Update `_save()` method**
   - Save test_results to JSON

4. **Implement `record_test_result()`**
   - Validation logic (verse exists, score range)
   - Create TestResult with UUID
   - Update VerseProgress via `_ensure_progress()`
   - Append to `_test_results` list

5. **Implement `get_test_history()`**
   - Filter by verse_id if provided
   - Sort by timestamp descending
   - Apply limit if provided

6. **Add unit tests** to [test_memory_mate.py](test_memory_mate.py)
   - Follow existing test structure
   - Test class for TestResult dataclass
   - Test class for test result methods
   - Integration tests with VerseProgress

7. **Update demo script** [demo_memory_mate.py](demo_memory_mate.py)
   - Showcase test result recording
   - Display test history
   - Show progress counters updating

8. **Verify cascade deletes still work**
   - Ensure `remove_verse()` deletes test results (already implemented)
   - Ensure `reset_progress()` deletes test results (already implemented)

---

## Future Enhancements (Post-MVP)

### Additional Fields
- `duration_seconds` - Time taken to complete test
- `test_type` - Recognition vs recall
- `hints_used` - Count of prompts needed

### Advanced Analytics
- Trend analysis (score improvement over time)
- Spaced repetition scheduling based on test history
- Streak tracking (consecutive passes/fails)

---

## Open Questions

None at this time. Design aligns with existing architecture and decisions documented in:
- [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md)
- [ccc.04.design-overview-verse-progress.md](ccc.04.design-overview-verse-progress.md)
- [ccc.00.active-context.md](ccc.00.active-context.md)

---

## References

- **Data Model Spec**: [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md) (lines 34-46, 188-196)
- **VerseProgress Design**: [ccc.04.design-overview-verse-progress.md](ccc.04.design-overview-verse-progress.md) (for integration patterns)
- **Current Implementation**: [memory_mate.py](memory_mate.py)
- **Existing Tests**: [test_memory_mate.py](test_memory_mate.py)
- **Active Context**: [ccc.00.active-context.md](ccc.00.active-context.md) (lines 50-67)

---

**Next Step**: Begin implementation following the order specified above, or await user approval to proceed.
