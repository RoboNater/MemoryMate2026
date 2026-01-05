"""Unit tests for Memory Mate prototype"""

import pytest
import json
import os
from datetime import datetime
from pathlib import Path
from memory_mate import MemoryMateStore, Verse, VerseProgress


@pytest.fixture
def temp_storage(tmp_path):
    """Fixture providing a temporary storage file path"""
    return str(tmp_path / "test_data.json")


@pytest.fixture
def store(temp_storage):
    """Fixture providing a fresh MemoryMateStore instance"""
    return MemoryMateStore(storage_path=temp_storage)


class TestVerseDataclass:
    """Tests for the Verse dataclass"""

    def test_verse_creation(self):
        """Test creating a verse with required fields"""
        verse = Verse(
            id="test-id",
            reference="John 3:16",
            text="For God so loved the world..."
        )
        assert verse.id == "test-id"
        assert verse.reference == "John 3:16"
        assert verse.text == "For God so loved the world..."
        assert verse.translation == "NIV"
        assert verse.archived is False

    def test_verse_creation_with_translation(self):
        """Test creating a verse with custom translation"""
        verse = Verse(
            id="test-id",
            reference="Psalm 23:1",
            text="The Lord is my shepherd...",
            translation="ESV"
        )
        assert verse.translation == "ESV"

    def test_verse_to_dict(self):
        """Test verse serialization to dict"""
        verse = Verse(
            id="test-id",
            reference="John 3:16",
            text="For God so loved the world...",
            translation="NIV"
        )
        verse_dict = verse.to_dict()
        assert verse_dict["id"] == "test-id"
        assert verse_dict["reference"] == "John 3:16"
        assert verse_dict["text"] == "For God so loved the world..."
        assert verse_dict["translation"] == "NIV"
        assert isinstance(verse_dict["created_at"], str)

    def test_verse_from_dict(self):
        """Test verse deserialization from dict"""
        verse_dict = {
            "id": "test-id",
            "reference": "John 3:16",
            "text": "For God so loved the world...",
            "translation": "NIV",
            "created_at": "2026-01-15T10:30:00",
            "archived": False
        }
        verse = Verse.from_dict(verse_dict)
        assert verse.id == "test-id"
        assert verse.reference == "John 3:16"
        assert verse.text == "For God so loved the world..."
        assert verse.translation == "NIV"
        assert isinstance(verse.created_at, datetime)
        assert verse.archived is False

    def test_verse_roundtrip(self):
        """Test serialization and deserialization roundtrip"""
        original = Verse(
            id="test-id",
            reference="Psalm 23:1",
            text="The Lord is my shepherd...",
            translation="ESV",
            archived=False
        )
        verse_dict = original.to_dict()
        restored = Verse.from_dict(verse_dict)
        assert restored.id == original.id
        assert restored.reference == original.reference
        assert restored.text == original.text
        assert restored.translation == original.translation
        assert restored.archived == original.archived


class TestAddVerse:
    """Tests for add_verse method"""

    def test_add_verse_basic(self, store):
        """Test adding a basic verse"""
        verse = store.add_verse(
            reference="John 3:16",
            text="For God so loved the world..."
        )
        assert verse.id is not None
        assert verse.reference == "John 3:16"
        assert verse.text == "For God so loved the world..."
        assert verse.translation == "NIV"
        assert verse.archived is False

    def test_add_verse_with_translation(self, store):
        """Test adding a verse with custom translation"""
        verse = store.add_verse(
            reference="Psalm 23:1",
            text="The Lord is my shepherd...",
            translation="ESV"
        )
        assert verse.translation == "ESV"

    def test_add_verse_generates_unique_ids(self, store):
        """Test that added verses have unique IDs"""
        verse1 = store.add_verse("John 3:16", "For God so loved the world...")
        verse2 = store.add_verse("Psalm 23:1", "The Lord is my shepherd...")
        assert verse1.id != verse2.id

    def test_add_verse_persists_to_storage(self, store, temp_storage):
        """Test that added verse is persisted to storage"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        assert os.path.exists(temp_storage)

        with open(temp_storage, 'r') as f:
            data = json.load(f)
        assert verse.id in data['verses']
        assert data['verses'][verse.id]['reference'] == "John 3:16"

    def test_add_multiple_verses(self, store):
        """Test adding multiple verses"""
        v1 = store.add_verse("John 3:16", "For God so loved the world...")
        v2 = store.add_verse("Psalm 23:1", "The Lord is my shepherd...")
        v3 = store.add_verse("Romans 3:23", "For all have sinned...")

        assert len(store.get_all_verses()) == 3


class TestGetVerse:
    """Tests for get_verse method"""

    def test_get_existing_verse(self, store):
        """Test retrieving an existing verse"""
        added = store.add_verse("John 3:16", "For God so loved the world...")
        retrieved = store.get_verse(added.id)
        assert retrieved is not None
        assert retrieved.id == added.id
        assert retrieved.reference == "John 3:16"

    def test_get_nonexistent_verse(self, store):
        """Test retrieving a non-existent verse returns None"""
        result = store.get_verse("nonexistent-id")
        assert result is None

    def test_get_verse_after_add(self, store):
        """Test that get_verse returns the exact verse that was added"""
        added = store.add_verse("Psalm 23:1", "The Lord is my shepherd...", "ESV")
        retrieved = store.get_verse(added.id)
        assert retrieved.reference == added.reference
        assert retrieved.text == added.text
        assert retrieved.translation == added.translation


class TestGetAllVerses:
    """Tests for get_all_verses method"""

    def test_get_all_verses_empty(self, store):
        """Test getting verses from empty store"""
        verses = store.get_all_verses()
        assert verses == []

    def test_get_all_verses_multiple(self, store):
        """Test getting multiple verses"""
        store.add_verse("John 3:16", "For God so loved the world...")
        store.add_verse("Psalm 23:1", "The Lord is my shepherd...")
        store.add_verse("Romans 3:23", "For all have sinned...")

        verses = store.get_all_verses()
        assert len(verses) == 3

    def test_get_all_verses_excludes_archived_by_default(self, store):
        """Test that archived verses are excluded by default"""
        v1 = store.add_verse("John 3:16", "For God so loved the world...")
        v2 = store.add_verse("Psalm 23:1", "The Lord is my shepherd...")

        store.archive_verse(v1.id)
        verses = store.get_all_verses()

        assert len(verses) == 1
        assert verses[0].id == v2.id

    def test_get_all_verses_includes_archived_when_requested(self, store):
        """Test that archived verses are included when requested"""
        v1 = store.add_verse("John 3:16", "For God so loved the world...")
        v2 = store.add_verse("Psalm 23:1", "The Lord is my shepherd...")

        store.archive_verse(v1.id)
        verses = store.get_all_verses(include_archived=True)

        assert len(verses) == 2

    def test_get_all_verses_returns_list(self, store):
        """Test that get_all_verses returns a list"""
        store.add_verse("John 3:16", "For God so loved the world...")
        verses = store.get_all_verses()
        assert isinstance(verses, list)


class TestUpdateVerse:
    """Tests for update_verse method"""

    def test_update_verse_reference(self, store):
        """Test updating verse reference"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        updated = store.update_verse(verse.id, reference="John 3:17")

        assert updated.reference == "John 3:17"
        assert updated.text == "For God so loved the world..."

    def test_update_verse_text(self, store):
        """Test updating verse text"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        new_text = "For God so loved the world that he gave his one and only Son..."
        updated = store.update_verse(verse.id, text=new_text)

        assert updated.text == new_text
        assert updated.reference == "John 3:16"

    def test_update_verse_translation(self, store):
        """Test updating verse translation"""
        verse = store.add_verse("John 3:16", "For God so loved the world...", "NIV")
        updated = store.update_verse(verse.id, translation="ESV")

        assert updated.translation == "ESV"

    def test_update_verse_multiple_fields(self, store):
        """Test updating multiple fields at once"""
        verse = store.add_verse("John 3:16", "For God so loved the world...", "NIV")
        updated = store.update_verse(
            verse.id,
            reference="John 3:17",
            text="New text",
            translation="ESV"
        )

        assert updated.reference == "John 3:17"
        assert updated.text == "New text"
        assert updated.translation == "ESV"

    def test_update_nonexistent_verse(self, store):
        """Test updating a non-existent verse returns None"""
        result = store.update_verse("nonexistent-id", reference="New")
        assert result is None

    def test_update_verse_persists(self, store, temp_storage):
        """Test that verse updates are persisted"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.update_verse(verse.id, reference="John 3:17")

        with open(temp_storage, 'r') as f:
            data = json.load(f)
        assert data['verses'][verse.id]['reference'] == "John 3:17"

    def test_update_with_none_values_leaves_unchanged(self, store):
        """Test that passing None values doesn't change fields"""
        verse = store.add_verse("John 3:16", "For God so loved the world...", "NIV")
        updated = store.update_verse(verse.id, reference=None, text=None)

        assert updated.reference == "John 3:16"
        assert updated.text == "For God so loved the world..."
        assert updated.translation == "NIV"


class TestRemoveVerse:
    """Tests for remove_verse method"""

    def test_remove_existing_verse(self, store):
        """Test removing an existing verse"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.remove_verse(verse.id)

        assert result is True
        assert store.get_verse(verse.id) is None

    def test_remove_nonexistent_verse(self, store):
        """Test removing a non-existent verse returns False"""
        result = store.remove_verse("nonexistent-id")
        assert result is False

    def test_remove_verse_reduces_count(self, store):
        """Test that removing a verse reduces the count"""
        v1 = store.add_verse("John 3:16", "For God so loved the world...")
        v2 = store.add_verse("Psalm 23:1", "The Lord is my shepherd...")

        assert len(store.get_all_verses(include_archived=True)) == 2
        store.remove_verse(v1.id)
        assert len(store.get_all_verses(include_archived=True)) == 1

    def test_remove_verse_persists(self, store, temp_storage):
        """Test that verse removal is persisted"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.remove_verse(verse.id)

        with open(temp_storage, 'r') as f:
            data = json.load(f)
        assert verse.id not in data['verses']


class TestArchiveVerse:
    """Tests for archive_verse method"""

    def test_archive_verse(self, store):
        """Test archiving a verse"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.archive_verse(verse.id)

        assert result is True
        archived = store.get_verse(verse.id)
        assert archived.archived is True

    def test_archive_nonexistent_verse(self, store):
        """Test archiving a non-existent verse returns False"""
        result = store.archive_verse("nonexistent-id")
        assert result is False

    def test_archived_verse_excluded_from_get_all(self, store):
        """Test that archived verse is excluded from get_all_verses"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.archive_verse(verse.id)

        verses = store.get_all_verses()
        assert verse.id not in [v.id for v in verses]

    def test_archived_verse_included_with_flag(self, store):
        """Test that archived verse is included with include_archived=True"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.archive_verse(verse.id)

        verses = store.get_all_verses(include_archived=True)
        assert verse.id in [v.id for v in verses]

    def test_archive_verse_persists(self, store, temp_storage):
        """Test that verse archival is persisted"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.archive_verse(verse.id)

        with open(temp_storage, 'r') as f:
            data = json.load(f)
        assert data['verses'][verse.id]['archived'] is True


class TestUnarchiveVerse:
    """Tests for unarchive_verse method"""

    def test_unarchive_verse(self, store):
        """Test unarchiving a verse"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.archive_verse(verse.id)

        result = store.unarchive_verse(verse.id)
        assert result is True

        unarchived = store.get_verse(verse.id)
        assert unarchived.archived is False

    def test_unarchive_nonexistent_verse(self, store):
        """Test unarchiving a non-existent verse returns False"""
        result = store.unarchive_verse("nonexistent-id")
        assert result is False

    def test_unarchived_verse_included_in_get_all(self, store):
        """Test that unarchived verse is included in get_all_verses"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.archive_verse(verse.id)
        store.unarchive_verse(verse.id)

        verses = store.get_all_verses()
        assert verse.id in [v.id for v in verses]

    def test_unarchive_verse_persists(self, store, temp_storage):
        """Test that verse unarchival is persisted"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.archive_verse(verse.id)
        store.unarchive_verse(verse.id)

        with open(temp_storage, 'r') as f:
            data = json.load(f)
        assert data['verses'][verse.id]['archived'] is False


class TestPersistence:
    """Tests for persistence (_load and _save)"""

    def test_save_creates_file(self, temp_storage):
        """Test that saving creates a storage file"""
        assert not os.path.exists(temp_storage)
        store = MemoryMateStore(storage_path=temp_storage)
        store.add_verse("John 3:16", "For God so loved the world...")
        assert os.path.exists(temp_storage)

    def test_load_from_existing_file(self, store, temp_storage):
        """Test loading data from an existing file"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        # Create a new store instance from the same file
        new_store = MemoryMateStore(storage_path=temp_storage)
        loaded = new_store.get_verse(verse.id)

        assert loaded is not None
        assert loaded.reference == "John 3:16"

    def test_load_nonexistent_file(self, temp_storage):
        """Test loading from non-existent file initializes empty store"""
        store = MemoryMateStore(storage_path=temp_storage)
        assert len(store.get_all_verses(include_archived=True)) == 0

    def test_persistence_multiple_operations(self, store, temp_storage):
        """Test that multiple operations persist correctly"""
        v1 = store.add_verse("John 3:16", "For God so loved the world...")
        v2 = store.add_verse("Psalm 23:1", "The Lord is my shepherd...")
        store.archive_verse(v1.id)

        # Load from file
        new_store = MemoryMateStore(storage_path=temp_storage)

        # Verify state is preserved
        assert len(new_store.get_all_verses(include_archived=True)) == 2
        assert len(new_store.get_all_verses()) == 1
        assert new_store.get_verse(v1.id).archived is True
        assert new_store.get_verse(v2.id).archived is False

    def test_json_format(self, store, temp_storage):
        """Test that storage file has valid JSON structure"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        with open(temp_storage, 'r') as f:
            data = json.load(f)

        assert 'verses' in data
        assert verse.id in data['verses']
        assert 'reference' in data['verses'][verse.id]
        assert 'text' in data['verses'][verse.id]

    def test_save_multiple_times(self, store, temp_storage):
        """Test that multiple saves don't cause issues"""
        store.add_verse("John 3:16", "For God so loved the world...")
        store.add_verse("Psalm 23:1", "The Lord is my shepherd...")

        # Manual save should work
        store._save()

        # File should still be valid
        new_store = MemoryMateStore(storage_path=temp_storage)
        assert len(new_store.get_all_verses(include_archived=True)) == 2


class TestEdgeCases:
    """Tests for edge cases and error handling"""

    def test_empty_verse_fields(self, store):
        """Test adding verse with empty text"""
        verse = store.add_verse("John 3:16", "")
        assert verse.text == ""

    def test_verse_with_special_characters(self, store):
        """Test verse with special characters and unicode"""
        text = "For God so loved the world... 🙏 Amen!"
        verse = store.add_verse("John 3:16", text)
        retrieved = store.get_verse(verse.id)
        assert retrieved.text == text

    def test_verse_with_long_text(self, store):
        """Test verse with very long text"""
        long_text = "For God so loved the world... " * 100
        verse = store.add_verse("John 3:16", long_text)
        retrieved = store.get_verse(verse.id)
        assert retrieved.text == long_text

    def test_archive_unarchive_cycle(self, store):
        """Test multiple archive/unarchive cycles"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        for _ in range(3):
            store.archive_verse(verse.id)
            assert store.get_verse(verse.id).archived is True
            store.unarchive_verse(verse.id)
            assert store.get_verse(verse.id).archived is False

    def test_update_then_archive(self, store):
        """Test updating a verse then archiving it"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.update_verse(verse.id, reference="John 3:17")
        store.archive_verse(verse.id)

        retrieved = store.get_verse(verse.id)
        assert retrieved.reference == "John 3:17"
        assert retrieved.archived is True


class TestVerseProgressDataclass:
    """Tests for the VerseProgress dataclass"""

    def test_progress_creation(self):
        """Test creating a VerseProgress with default values"""
        progress = VerseProgress(verse_id="test-verse-id")
        assert progress.verse_id == "test-verse-id"
        assert progress.times_practiced == 0
        assert progress.times_tested == 0
        assert progress.times_correct == 0
        assert progress.last_practiced is None
        assert progress.last_tested is None
        assert progress.comfort_level == 1

    def test_progress_creation_with_values(self):
        """Test creating a VerseProgress with custom values"""
        progress = VerseProgress(
            verse_id="test-verse-id",
            times_practiced=5,
            times_tested=3,
            times_correct=2,
            comfort_level=3
        )
        assert progress.times_practiced == 5
        assert progress.times_tested == 3
        assert progress.times_correct == 2
        assert progress.comfort_level == 3

    def test_progress_to_dict(self):
        """Test progress serialization to dict"""
        progress = VerseProgress(
            verse_id="test-verse-id",
            times_practiced=5,
            comfort_level=3
        )
        progress_dict = progress.to_dict()
        assert progress_dict['verse_id'] == "test-verse-id"
        assert progress_dict['times_practiced'] == 5
        assert progress_dict['times_tested'] == 0
        assert progress_dict['times_correct'] == 0
        assert progress_dict['comfort_level'] == 3
        assert progress_dict['last_practiced'] is None
        assert progress_dict['last_tested'] is None

    def test_progress_to_dict_with_timestamps(self):
        """Test progress serialization with timestamps"""
        now = datetime.now()
        progress = VerseProgress(
            verse_id="test-verse-id",
            last_practiced=now,
            last_tested=now
        )
        progress_dict = progress.to_dict()
        assert isinstance(progress_dict['last_practiced'], str)
        assert isinstance(progress_dict['last_tested'], str)

    def test_progress_from_dict(self):
        """Test progress deserialization from dict"""
        progress_dict = {
            'verse_id': "test-verse-id",
            'times_practiced': 5,
            'times_tested': 3,
            'times_correct': 2,
            'last_practiced': "2026-01-20T14:30:00",
            'last_tested': "2026-01-19T09:15:00",
            'comfort_level': 3
        }
        progress = VerseProgress.from_dict(progress_dict)
        assert progress.verse_id == "test-verse-id"
        assert progress.times_practiced == 5
        assert progress.times_tested == 3
        assert progress.times_correct == 2
        assert progress.comfort_level == 3
        assert isinstance(progress.last_practiced, datetime)
        assert isinstance(progress.last_tested, datetime)

    def test_progress_from_dict_null_timestamps(self):
        """Test progress deserialization with null timestamps"""
        progress_dict = {
            'verse_id': "test-verse-id",
            'times_practiced': 0,
            'times_tested': 0,
            'times_correct': 0,
            'last_practiced': None,
            'last_tested': None,
            'comfort_level': 1
        }
        progress = VerseProgress.from_dict(progress_dict)
        assert progress.last_practiced is None
        assert progress.last_tested is None

    def test_progress_roundtrip(self):
        """Test serialization and deserialization roundtrip"""
        original = VerseProgress(
            verse_id="test-verse-id",
            times_practiced=5,
            times_tested=3,
            times_correct=2,
            comfort_level=4
        )
        progress_dict = original.to_dict()
        restored = VerseProgress.from_dict(progress_dict)
        assert restored.verse_id == original.verse_id
        assert restored.times_practiced == original.times_practiced
        assert restored.times_tested == original.times_tested
        assert restored.times_correct == original.times_correct
        assert restored.comfort_level == original.comfort_level


class TestGetProgress:
    """Tests for get_progress method"""

    def test_get_progress_nonexistent_verse(self, store):
        """Test getting progress for a verse that doesn't exist"""
        result = store.get_progress("nonexistent-verse-id")
        assert result is None

    def test_get_progress_unpracticed_verse(self, store):
        """Test getting progress for a verse that hasn't been practiced"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.get_progress(verse.id)
        assert result is None

    def test_get_progress_practiced_verse(self, store):
        """Test getting progress for a practiced verse"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        result = store.get_progress(verse.id)
        assert result is not None
        assert result.verse_id == verse.id
        assert result.times_practiced == 1


class TestRecordPractice:
    """Tests for record_practice method"""

    def test_record_practice_nonexistent_verse(self, store):
        """Test recording practice for non-existent verse returns False"""
        result = store.record_practice("nonexistent-verse-id")
        assert result is False

    def test_record_practice_creates_progress(self, store):
        """Test that recording practice creates progress lazily"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        assert store.get_progress(verse.id) is None

        result = store.record_practice(verse.id)
        assert result is True
        assert store.get_progress(verse.id) is not None

    def test_record_practice_increments_counter(self, store):
        """Test that record_practice increments the counter"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        assert store.get_progress(verse.id).times_practiced == 1

        store.record_practice(verse.id)
        assert store.get_progress(verse.id).times_practiced == 2

    def test_record_practice_updates_timestamp(self, store):
        """Test that record_practice updates last_practiced timestamp"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        assert store.get_progress(verse.id) is None

        store.record_practice(verse.id)
        progress = store.get_progress(verse.id)
        assert progress.last_practiced is not None
        assert isinstance(progress.last_practiced, datetime)

    def test_record_practice_multiple_times(self, store):
        """Test recording multiple practices"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        for i in range(1, 6):
            store.record_practice(verse.id)
            assert store.get_progress(verse.id).times_practiced == i

    def test_record_practice_persists(self, store, temp_storage):
        """Test that practice recording persists to storage"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)

        # Load from storage
        new_store = MemoryMateStore(storage_path=temp_storage)
        progress = new_store.get_progress(verse.id)
        assert progress is not None
        assert progress.times_practiced == 1


class TestSetComfortLevel:
    """Tests for set_comfort_level method"""

    def test_set_comfort_level_nonexistent_verse(self, store):
        """Test setting comfort for non-existent verse returns False"""
        result = store.set_comfort_level("nonexistent-verse-id", 3)
        assert result is False

    def test_set_comfort_level_invalid_too_low(self, store):
        """Test that comfort level < 1 is rejected"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.set_comfort_level(verse.id, 0)
        assert result is False

    def test_set_comfort_level_invalid_too_high(self, store):
        """Test that comfort level > 5 is rejected"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.set_comfort_level(verse.id, 6)
        assert result is False

    def test_set_comfort_level_invalid_negative(self, store):
        """Test that negative comfort level is rejected"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.set_comfort_level(verse.id, -1)
        assert result is False

    def test_set_comfort_level_invalid_float(self, store):
        """Test that float comfort level is rejected"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        result = store.set_comfort_level(verse.id, 3.5)
        assert result is False

    def test_set_comfort_level_valid_range(self, store):
        """Test setting valid comfort levels 1-5"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        for level in range(1, 6):
            result = store.set_comfort_level(verse.id, level)
            assert result is True
            assert store.get_progress(verse.id).comfort_level == level

    def test_set_comfort_level_creates_progress(self, store):
        """Test that setting comfort creates progress lazily"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        assert store.get_progress(verse.id) is None

        store.set_comfort_level(verse.id, 3)
        assert store.get_progress(verse.id) is not None

    def test_set_comfort_level_persists(self, store, temp_storage):
        """Test that comfort level persists to storage"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.set_comfort_level(verse.id, 4)

        # Load from storage
        new_store = MemoryMateStore(storage_path=temp_storage)
        progress = new_store.get_progress(verse.id)
        assert progress is not None
        assert progress.comfort_level == 4


class TestResetProgress:
    """Tests for reset_progress method"""

    def test_reset_progress_nonexistent_verse(self, store):
        """Test resetting progress for non-existent verse returns False"""
        result = store.reset_progress("nonexistent-verse-id")
        assert result is False

    def test_reset_progress_unpracticed_verse(self, store):
        """Test resetting progress on unpracticed verse creates fresh record"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        assert store.get_progress(verse.id) is None

        result = store.reset_progress(verse.id)
        assert result is True

        progress = store.get_progress(verse.id)
        assert progress is not None
        assert progress.times_practiced == 0
        assert progress.times_tested == 0
        assert progress.times_correct == 0
        assert progress.last_practiced is None
        assert progress.last_tested is None
        assert progress.comfort_level == 1

    def test_reset_progress_practiced_verse(self, store):
        """Test resetting progress on practiced verse"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 4)

        assert store.get_progress(verse.id).times_practiced == 2
        assert store.get_progress(verse.id).comfort_level == 4

        result = store.reset_progress(verse.id)
        assert result is True

        progress = store.get_progress(verse.id)
        assert progress.times_practiced == 0
        assert progress.comfort_level == 1

    def test_reset_progress_persists(self, store, temp_storage):
        """Test that progress reset persists to storage"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        store.reset_progress(verse.id)

        # Load from storage
        new_store = MemoryMateStore(storage_path=temp_storage)
        progress = new_store.get_progress(verse.id)
        assert progress is not None
        assert progress.times_practiced == 0


class TestProgressPersistence:
    """Tests for progress persistence (saving and loading)"""

    def test_save_progress_to_json(self, store, temp_storage):
        """Test that progress is saved to JSON"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 3)

        with open(temp_storage, 'r') as f:
            data = json.load(f)

        assert 'progress' in data
        assert verse.id in data['progress']
        assert data['progress'][verse.id]['times_practiced'] == 1
        assert data['progress'][verse.id]['comfort_level'] == 3

    def test_load_progress_from_json(self, temp_storage):
        """Test that progress loads from JSON correctly"""
        # Manually create a storage file with progress
        data = {
            'verses': {
                'verse-1': {
                    'id': 'verse-1',
                    'reference': 'John 3:16',
                    'text': 'For God so loved the world...',
                    'translation': 'NIV',
                    'created_at': '2026-01-15T10:30:00',
                    'archived': False
                }
            },
            'progress': {
                'verse-1': {
                    'verse_id': 'verse-1',
                    'times_practiced': 5,
                    'times_tested': 3,
                    'times_correct': 2,
                    'last_practiced': '2026-01-20T14:30:00',
                    'last_tested': '2026-01-19T09:15:00',
                    'comfort_level': 3
                }
            }
        }
        with open(temp_storage, 'w') as f:
            json.dump(data, f)

        store = MemoryMateStore(storage_path=temp_storage)
        progress = store.get_progress('verse-1')

        assert progress is not None
        assert progress.times_practiced == 5
        assert progress.times_tested == 3
        assert progress.times_correct == 2
        assert progress.comfort_level == 3

    def test_progress_empty_on_new_store(self, temp_storage):
        """Test that new store has no progress"""
        store = MemoryMateStore(storage_path=temp_storage)
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        assert store.get_progress(verse.id) is None


class TestProgressIntegration:
    """Integration tests for progress tracking"""

    def test_practice_then_check_progress(self, store):
        """Test full workflow: add verse, practice, check progress"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        # No progress initially
        assert store.get_progress(verse.id) is None

        # Practice
        store.record_practice(verse.id)

        # Progress exists
        progress = store.get_progress(verse.id)
        assert progress.times_practiced == 1
        assert progress.last_practiced is not None

    def test_practice_then_set_comfort(self, store):
        """Test practice followed by setting comfort"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 3)

        progress = store.get_progress(verse.id)
        assert progress.times_practiced == 1
        assert progress.comfort_level == 3

    def test_comfort_on_unpracticed_verse(self, store):
        """Test setting comfort on unpracticed verse"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.set_comfort_level(verse.id, 3)

        progress = store.get_progress(verse.id)
        assert progress.times_practiced == 0
        assert progress.comfort_level == 3

    def test_multiple_practices_and_comfort_changes(self, store):
        """Test multiple practices with comfort level changes"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")

        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 2)
        assert store.get_progress(verse.id).comfort_level == 2

        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 3)
        assert store.get_progress(verse.id).times_practiced == 2
        assert store.get_progress(verse.id).comfort_level == 3

        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 4)
        assert store.get_progress(verse.id).times_practiced == 3
        assert store.get_progress(verse.id).comfort_level == 4

    def test_reset_clears_progress_completely(self, store):
        """Test that reset clears all progress data"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        store.record_practice(verse.id)
        store.set_comfort_level(verse.id, 4)

        store.reset_progress(verse.id)

        progress = store.get_progress(verse.id)
        assert progress.times_practiced == 0
        assert progress.times_tested == 0
        assert progress.times_correct == 0
        assert progress.last_practiced is None
        assert progress.last_tested is None
        assert progress.comfort_level == 1

    def test_remove_verse_cascades_to_progress(self, store):
        """Test that removing a verse also removes its progress"""
        verse = store.add_verse("John 3:16", "For God so loved the world...")
        store.record_practice(verse.id)
        assert store.get_progress(verse.id) is not None

        store.remove_verse(verse.id)

        assert store.get_verse(verse.id) is None
        assert store.get_progress(verse.id) is None
