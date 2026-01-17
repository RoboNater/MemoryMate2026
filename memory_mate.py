"""Memory Mate Prototype - Data Model and Store Implementation"""

from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Optional
import uuid
import json
import os


@dataclass
class Verse:
    """A memorizable verse or text."""
    id: str
    reference: str
    text: str
    translation: str = "NIV"
    created_at: datetime = field(default_factory=datetime.now)
    archived: bool = False

    def to_dict(self) -> dict:
        """Convert verse to dictionary for JSON serialization."""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data

    @staticmethod
    def from_dict(data: dict) -> 'Verse':
        """Create Verse from dictionary (JSON deserialization)."""
        data = data.copy()
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        return Verse(**data)


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


@dataclass
class TestResult:
    """Individual test attempt record."""
    id: str
    verse_id: str
    timestamp: datetime
    passed: bool
    score: Optional[float] = None  # 0.0-1.0

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
        self._progress: dict[str, 'VerseProgress'] = {}  # Lazily initialized
        self._test_results: list['TestResult'] = []  # Lazily initialized
        self._load()

    # ========== Verse Management ==========

    def add_verse(self, reference: str, text: str, translation: str = "NIV") -> Verse:
        """Add a new verse to the collection."""
        verse = Verse(
            id=str(uuid.uuid4()),
            reference=reference,
            text=text,
            translation=translation
        )
        self._verses[verse.id] = verse
        self._save()
        return verse

    def get_verse(self, verse_id: str) -> Optional[Verse]:
        """Retrieve a verse by ID."""
        return self._verses.get(verse_id)

    def get_all_verses(self, include_archived: bool = False) -> list[Verse]:
        """Get all verses, optionally including archived ones."""
        verses = list(self._verses.values())
        if not include_archived:
            verses = [v for v in verses if not v.archived]
        return verses

    def update_verse(self, verse_id: str, reference: str = None,
                     text: str = None, translation: str = None) -> Optional[Verse]:
        """Update verse fields. Only provided fields are updated."""
        verse = self._verses.get(verse_id)
        if not verse:
            return None

        if reference is not None:
            verse.reference = reference
        if text is not None:
            verse.text = text
        if translation is not None:
            verse.translation = translation

        self._save()
        return verse

    def remove_verse(self, verse_id: str) -> bool:
        """
        Permanently delete a verse and its associated data.

        Cascade deletes:
        - The Verse record
        - Associated VerseProgress (if exists)
        - All TestResults for this verse
        """
        if verse_id not in self._verses:
            return False

        # Delete the verse
        del self._verses[verse_id]

        # Cascade delete: remove associated progress
        if verse_id in self._progress:
            del self._progress[verse_id]

        # Cascade delete: remove associated test results
        self._test_results = [tr for tr in self._test_results if tr.verse_id != verse_id]

        self._save()
        return True

    def archive_verse(self, verse_id: str) -> bool:
        """Archive a verse (soft delete - hides from active practice)."""
        verse = self._verses.get(verse_id)
        if not verse:
            return False

        verse.archived = True
        self._save()
        return True

    def unarchive_verse(self, verse_id: str) -> bool:
        """Restore an archived verse to active status."""
        verse = self._verses.get(verse_id)
        if not verse:
            return False

        verse.archived = False
        self._save()
        return True

    # ========== Progress Tracking ==========

    def _ensure_progress(self, verse_id: str) -> Optional[VerseProgress]:
        """
        Ensure progress record exists for a verse (lazy creation).

        Returns the existing or newly created VerseProgress, or None if verse doesn't exist.
        """
        if verse_id not in self._verses:
            return None

        if verse_id not in self._progress:
            self._progress[verse_id] = VerseProgress(verse_id=verse_id)

        return self._progress[verse_id]

    def get_progress(self, verse_id: str) -> Optional[VerseProgress]:
        """Get progress data for a specific verse."""
        return self._progress.get(verse_id)

    def record_practice(self, verse_id: str) -> bool:
        """Record that a verse was practiced."""
        progress = self._ensure_progress(verse_id)
        if not progress:
            return False

        progress.times_practiced += 1
        progress.last_practiced = datetime.now()
        self._save()
        return True

    def set_comfort_level(self, verse_id: str, level: int) -> bool:
        """Set the user's self-assessed comfort level (1-5)."""
        if not isinstance(level, int) or level < 1 or level > 5:
            return False

        progress = self._ensure_progress(verse_id)
        if not progress:
            return False

        progress.comfort_level = level
        self._save()
        return True

    def reset_progress(self, verse_id: str) -> bool:
        """Reset all progress for a verse to initial state."""
        if verse_id not in self._verses:
            return False

        # Create fresh progress record
        self._progress[verse_id] = VerseProgress(verse_id=verse_id)

        # Cascade delete: remove all test results for this verse
        self._test_results = [tr for tr in self._test_results if tr.verse_id != verse_id]

        self._save()
        return True

    # ========== Test Results ==========

    def record_test_result(self, verse_id: str, passed: bool,
                          score: Optional[float] = None) -> Optional[TestResult]:
        """
        Record a test attempt for a verse.

        Args:
            verse_id: The verse being tested
            passed: Whether the test was passed
            score: Optional accuracy score (0.0-1.0)

        Returns:
            TestResult object if successfully recorded, None if validation fails
        """
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

    def get_test_history(self, verse_id: Optional[str] = None,
                        limit: Optional[int] = None) -> list[TestResult]:
        """
        Retrieve test history, optionally filtered by verse and limited in quantity.

        Args:
            verse_id: Optional filter to get results for specific verse only
            limit: Optional maximum number of results to return (most recent first)

        Returns:
            List of TestResult objects sorted by timestamp (newest first)
        """
        # Start with all test results
        results = self._test_results.copy()

        # Filter by verse_id if provided
        if verse_id is not None:
            results = [tr for tr in results if tr.verse_id == verse_id]

        # Sort by timestamp descending (newest first)
        results.sort(key=lambda tr: tr.timestamp, reverse=True)

        # Apply limit if provided
        if limit is not None:
            results = results[:limit]

        return results

    # ========== Statistics ==========

    def get_stats(self) -> dict:
        """
        Get overall statistics across all verses.

        Returns:
            Dict with keys:
            - total_verses: Number of active (non-archived) verses
            - total_archived: Number of archived verses
            - total_practiced: Sum of all practice sessions
            - total_tested: Sum of all test attempts
            - total_correct: Sum of all correct test answers
            - overall_accuracy: Percentage of correct tests (0.0-1.0)
            - verses_with_perfect_comfort: Number of verses at comfort level 5
            - average_comfort_level: Mean comfort level across verses with progress
        """
        # Verse counts
        all_verses = list(self._verses.values())
        active_verses = [v for v in all_verses if not v.archived]
        archived_verses = [v for v in all_verses if v.archived]

        # Aggregate progress across all verses
        total_practiced = sum(p.times_practiced for p in self._progress.values())
        total_tested = sum(p.times_tested for p in self._progress.values())
        total_correct = sum(p.times_correct for p in self._progress.values())

        # Calculate accuracy
        overall_accuracy = (total_correct / total_tested) if total_tested > 0 else 0.0

        # Comfort level stats
        comfort_levels = [p.comfort_level for p in self._progress.values()]
        verses_with_perfect_comfort = sum(1 for p in self._progress.values() if p.comfort_level == 5)
        average_comfort = (sum(comfort_levels) / len(comfort_levels)) if comfort_levels else 0.0

        return {
            'total_verses': len(active_verses),
            'total_archived': len(archived_verses),
            'total_practiced': total_practiced,
            'total_tested': total_tested,
            'total_correct': total_correct,
            'overall_accuracy': overall_accuracy,
            'verses_with_perfect_comfort': verses_with_perfect_comfort,
            'average_comfort_level': average_comfort
        }

    def get_verse_stats(self, verse_id: str) -> Optional[dict]:
        """
        Get statistics for a specific verse.

        Args:
            verse_id: The verse to get statistics for

        Returns:
            Dict with keys:
            - reference: Verse reference
            - times_practiced: Number of practice sessions
            - times_tested: Number of test attempts
            - times_correct: Number of correct answers
            - accuracy: Percentage of correct tests (0.0-1.0)
            - comfort_level: User's self-assessed comfort (1-5)
            - last_practiced: Most recent practice timestamp
            - last_tested: Most recent test timestamp
            - consecutive_correct: Number of consecutive correct test results
            Or None if verse doesn't exist
        """
        verse = self._verses.get(verse_id)
        if not verse:
            return None

        progress = self._progress.get(verse_id)
        if not progress:
            # Verse exists but no progress yet
            return {
                'reference': verse.reference,
                'times_practiced': 0,
                'times_tested': 0,
                'times_correct': 0,
                'accuracy': 0.0,
                'comfort_level': 1,
                'last_practiced': None,
                'last_tested': None,
                'consecutive_correct': 0
            }

        # Get test history for this verse to calculate consecutive correct
        verse_tests = [tr for tr in self._test_results if tr.verse_id == verse_id]
        verse_tests.sort(key=lambda tr: tr.timestamp, reverse=True)

        consecutive_correct = 0
        for test in verse_tests:
            if test.passed:
                consecutive_correct += 1
            else:
                break

        # Calculate accuracy
        accuracy = (progress.times_correct / progress.times_tested) if progress.times_tested > 0 else 0.0

        return {
            'reference': verse.reference,
            'times_practiced': progress.times_practiced,
            'times_tested': progress.times_tested,
            'times_correct': progress.times_correct,
            'accuracy': accuracy,
            'comfort_level': progress.comfort_level,
            'last_practiced': progress.last_practiced.isoformat() if progress.last_practiced else None,
            'last_tested': progress.last_tested.isoformat() if progress.last_tested else None,
            'consecutive_correct': consecutive_correct
        }

    # ========== Persistence ==========

    def _load(self) -> None:
        """Load data from storage file."""
        if not os.path.exists(self._storage_path):
            return

        try:
            with open(self._storage_path, 'r') as f:
                data = json.load(f)

            # Load verses
            verses_data = data.get('verses', {})
            for verse_id, verse_dict in verses_data.items():
                self._verses[verse_id] = Verse.from_dict(verse_dict)

            # Load progress
            progress_data = data.get('progress', {})
            for verse_id, progress_dict in progress_data.items():
                self._progress[verse_id] = VerseProgress.from_dict(progress_dict)

            # Load test results
            test_results_data = data.get('test_results', [])
            for result_dict in test_results_data:
                self._test_results.append(TestResult.from_dict(result_dict))
        except (json.JSONDecodeError, IOError) as e:
            raise RuntimeError(f"Failed to load data from {self._storage_path}: {e}")

    def _save(self) -> None:
        """Save data to storage file."""
        data = {
            'verses': {verse_id: verse.to_dict() for verse_id, verse in self._verses.items()},
            'progress': {verse_id: prog.to_dict() for verse_id, prog in self._progress.items()},
            'test_results': [tr.to_dict() for tr in self._test_results]
        }

        try:
            with open(self._storage_path, 'w') as f:
                json.dump(data, f, indent=2)
        except IOError as e:
            raise RuntimeError(f"Failed to save data to {self._storage_path}: {e}")
