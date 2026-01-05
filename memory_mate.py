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
        except (json.JSONDecodeError, IOError) as e:
            raise RuntimeError(f"Failed to load data from {self._storage_path}: {e}")

    def _save(self) -> None:
        """Save data to storage file."""
        data = {
            'verses': {verse_id: verse.to_dict() for verse_id, verse in self._verses.items()}
        }

        try:
            with open(self._storage_path, 'w') as f:
                json.dump(data, f, indent=2)
        except IOError as e:
            raise RuntimeError(f"Failed to save data to {self._storage_path}: {e}")
