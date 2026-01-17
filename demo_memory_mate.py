"""
Demo script showcasing Memory Mate prototype capabilities

This script demonstrates the current functionality of the Verse data model
and MemoryMateStore class, including verse management and persistence.
"""

from memory_mate import MemoryMateStore
import json
import time


def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def print_verse(verse, include_id=True):
    """Print a formatted verse"""
    if include_id:
        print(f"  ID: {verse.id}")
    print(f"  Reference: {verse.reference}")
    print(f"  Translation: {verse.translation}")
    print(f"  Text: {verse.text}")
    if verse.archived:
        print(f"  Status: ARCHIVED")
    print()


def print_progress(progress, show_all=True):
    """Print formatted progress information"""
    if progress is None:
        print("  No progress recorded yet (not yet practiced)")
        return

    print(f"  Times Practiced: {progress.times_practiced}")
    print(f"  Times Tested: {progress.times_tested}")
    print(f"  Times Correct: {progress.times_correct}")
    print(f"  Comfort Level: {progress.comfort_level}/5")
    if progress.last_practiced:
        print(f"  Last Practiced: {progress.last_practiced.strftime('%Y-%m-%d %H:%M:%S')}")
    if progress.last_tested and show_all:
        print(f"  Last Tested: {progress.last_tested.strftime('%Y-%m-%d %H:%M:%S')}")
    print()


def demo_basic_operations():
    """Demonstrate basic CRUD operations"""
    print_section("1. BASIC OPERATIONS - Adding and Retrieving Verses")

    # Create a store
    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    # Add some verses
    print("→ Adding 3 Bible verses to the store...\n")

    john = store.add_verse(
        reference="John 3:16",
        text= (
              "For God so loved the world that he gave his one and only [begotten] Son, "
            + "that whoever believes in him shall not perish but have eternal life."),
        translation="NIV"
    )
    print("Added verse:")
    print_verse(john)

    psalm = store.add_verse(
        reference="Psalm 23:1",
        text="The Lord is my shepherd, I shall not be in want.",
        translation="ESV"
    )
    print("Added verse:")
    print_verse(psalm)

    romans = store.add_verse(
        reference="Romans 3:23",
        text="For all have sinned and fall short of the glory of God.",
        translation="KJV"
    )
    print("Added verse:")
    print_verse(romans)

    # Retrieve a specific verse
    print("\n→ Retrieving John 3:16 by ID...\n")
    retrieved = store.get_verse(john.id)
    print("Retrieved verse:")
    print_verse(retrieved)

    # Get all verses
    print("\n→ Getting all verses in the store...\n")
    all_verses = store.get_all_verses()
    print(f"Total verses: {len(all_verses)}\n")
    for i, verse in enumerate(all_verses, 1):
        print(f"{i}. {verse.reference} ({verse.translation})")
    print()

    return store


def demo_update_operations(store):
    """Demonstrate update operations"""
    print_section("2. UPDATE OPERATIONS - Modifying Verses")

    verses = store.get_all_verses()
    target_verse = verses[0]  # Update the first verse

    print(f"→ Updating verse: {target_verse.reference}\n")
    print("Before update:")
    print_verse(target_verse, include_id=False)

    # Update the translation
    updated = store.update_verse(
        target_verse.id,
        translation="ESV"
    )

    print("After updating translation to ESV:")
    print_verse(updated, include_id=False)

    # Update the text
    print("→ Updating the text of the verse...\n")
    updated = store.update_verse(
        target_verse.id,
        text="For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life. (Updated translation)"
    )

    print("After text update:")
    print_verse(updated, include_id=False)


def demo_archive_operations(store):
    """Demonstrate archive/unarchive operations"""
    print_section("3. ARCHIVE OPERATIONS - Managing Active vs Archived Verses")

    verses = store.get_all_verses()
    target_verse = verses[0]

    print(f"→ Current verses in store: {len(verses)}\n")
    for verse in verses:
        print(f"  • {verse.reference}")
    print()

    # Archive a verse
    print(f"→ Archiving {target_verse.reference}...\n")
    store.archive_verse(target_verse.id)

    active_verses = store.get_all_verses()
    print(f"Active verses after archiving: {len(active_verses)}\n")
    for verse in active_verses:
        print(f"  • {verse.reference}")
    print()

    # View all verses including archived
    print("→ Getting ALL verses including archived ones...\n")
    all_verses = store.get_all_verses(include_archived=True)
    print(f"Total verses (active + archived): {len(all_verses)}\n")
    for verse in all_verses:
        status = "[ARCHIVED]" if verse.archived else "[ACTIVE]"
        print(f"  • {verse.reference} {status}")
    print()

    # Unarchive the verse
    print(f"→ Unarchiving {target_verse.reference}...\n")
    store.unarchive_verse(target_verse.id)

    active_verses = store.get_all_verses()
    print(f"Active verses after unarchiving: {len(active_verses)}\n")
    for verse in active_verses:
        print(f"  • {verse.reference}")
    print()


def demo_remove_operations(store):
    """Demonstrate removal operations"""
    print_section("4. REMOVAL OPERATIONS - Deleting Verses")

    verses = store.get_all_verses()
    print(f"→ Current verses in store: {len(verses)}\n")
    for verse in verses:
        print(f"  • {verse.reference}")
    print()

    # Remove a verse
    target_verse = verses[-1]  # Remove the last verse
    print(f"→ Removing {target_verse.reference}...\n")
    success = store.remove_verse(target_verse.id)
    print(f"Removal successful: {success}\n")

    # Show remaining verses
    remaining = store.get_all_verses(include_archived=True)
    print(f"Verses remaining: {len(remaining)}\n")
    for verse in remaining:
        print(f"  • {verse.reference}")
    print()


def demo_persistence(store):
    """Demonstrate persistence and data storage"""
    print_section("5. PERSISTENCE - Data Storage and Loading")

    print("→ Current store state (in memory):\n")
    verses = store.get_all_verses(include_archived=True)
    print(f"  Total verses: {len(verses)}")
    for verse in verses:
        status = "[ARCHIVED]" if verse.archived else "[ACTIVE]"
        print(f"    • {verse.reference} {status}")
    print()

    # Show JSON file content
    print("→ JSON storage file content:\n")
    try:
        with open("demo_memory_mate_data.json", 'r') as f:
            data = json.load(f)
        print(f"  File: demo_memory_mate_data.json")
        print(f"  Verses in storage: {len(data['verses'])}\n")
        for verse_id, verse_data in list(data['verses'].items())[:2]:  # Show first 2
            print(f"  {verse_data['reference']}:")
            print(f"    - ID: {verse_id}")
            print(f"    - Translation: {verse_data['translation']}")
            print(f"    - Archived: {verse_data['archived']}")
            print()
    except FileNotFoundError:
        print("  (Storage file not yet created)")
        print()

    # Demonstrate loading from persisted storage
    print("→ Creating new store from same storage file (simulating app restart)...\n")
    new_store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    loaded_verses = new_store.get_all_verses(include_archived=True)
    print(f"  Verses loaded from storage: {len(loaded_verses)}")
    for verse in loaded_verses:
        status = "[ARCHIVED]" if verse.archived else "[ACTIVE]"
        print(f"    • {verse.reference} {status}")
    print()

    return new_store


def demo_verse_lookup():
    """Demonstrate verse lookup and retrieval"""
    print_section("6. VERSE LOOKUP - Finding Specific Verses")

    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    print("→ All verses currently in store:\n")
    all_verses = store.get_all_verses()

    if not all_verses:
        print("  (No active verses in store)")
        print()
        return

    for i, verse in enumerate(all_verses, 1):
        print(f"{i}. {verse.reference} ({verse.translation}) - ID: {verse.id}")
    print()

    # Look up by ID
    if all_verses:
        target = all_verses[0]
        print(f"→ Looking up verse by ID: {target.id}\n")
        found = store.get_verse(target.id)
        if found:
            print("Found:")
            print_verse(found)


def demo_error_handling():
    """Demonstrate error handling"""
    print_section("7. ERROR HANDLING - Graceful Failure Cases")

    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    print("→ Attempting to retrieve non-existent verse...\n")
    result = store.get_verse("nonexistent-id-12345")
    print(f"  Result: {result}")
    print("  ✓ Gracefully returns None\n")

    print("→ Attempting to update non-existent verse...\n")
    result = store.update_verse("nonexistent-id-12345", reference="New Reference")
    print(f"  Result: {result}")
    print("  ✓ Gracefully returns None\n")

    print("→ Attempting to remove non-existent verse...\n")
    result = store.remove_verse("nonexistent-id-12345")
    print(f"  Result: {result}")
    print("  ✓ Gracefully returns False\n")

    print("→ Attempting to archive non-existent verse...\n")
    result = store.archive_verse("nonexistent-id-12345")
    print(f"  Result: {result}")
    print("  ✓ Gracefully returns False\n")


def demo_data_model():
    """Demonstrate the Verse data model"""
    print_section("7. DATA MODEL - Verse Structure")

    from memory_mate import Verse
    from datetime import datetime

    print("→ Creating a Verse instance directly:\n")

    verse = Verse(
        id="demo-verse-1",
        reference="1 John 1:1",
        text="That which was from the beginning, which we have heard, which we have seen with our eyes, which we have looked at and our hands have touched—this we proclaim concerning the Word of life.",
        translation="NIV",
        archived=False
    )

    print(f"  Reference: {verse.reference}")
    print(f"  Translation: {verse.translation}")
    print(f"  Text: {verse.text}")
    print(f"  Created at: {verse.created_at}")
    print(f"  Archived: {verse.archived}\n")

    # Demonstrate serialization
    print("→ Serializing Verse to dictionary:\n")
    verse_dict = verse.to_dict()
    print(f"  {json.dumps(verse_dict, indent=2)}\n")

    # Demonstrate deserialization
    print("→ Deserializing dictionary back to Verse:\n")
    restored_verse = Verse.from_dict(verse_dict)
    print(f"  Reference: {restored_verse.reference}")
    print(f"  Type of created_at: {type(restored_verse.created_at)}")
    print(f"  ✓ Successfully restored from JSON representation\n")


def demo_test_results():
    """Demonstrate test result recording and history"""
    print_section("9. TEST RESULTS - Recording Tests and Viewing History")

    # Create a fresh store for this demo
    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    # Add a verse
    verse = store.add_verse(
        reference="John 3:16",
        text="For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        translation="NIV"
    )
    print(f"→ Added verse for testing: {verse.reference}\n")

    # Record some test attempts
    print("→ Recording test attempts with various outcomes:\n")

    result1 = store.record_test_result(verse.id, passed=True, score=0.85)
    print(f"  Test 1: Passed with 85% accuracy")
    print(f"    - Timestamp: {result1.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"    - ID: {result1.id}\n")

    result2 = store.record_test_result(verse.id, passed=True, score=0.92)
    print(f"  Test 2: Passed with 92% accuracy\n")

    result3 = store.record_test_result(verse.id, passed=False, score=0.65)
    print(f"  Test 3: Failed with 65% accuracy\n")

    result4 = store.record_test_result(verse.id, passed=True, score=0.88)
    print(f"  Test 4: Passed with 88% accuracy\n")

    # Check progress updates
    print("→ Progress after tests:\n")
    progress = store.get_progress(verse.id)
    print(f"  Times Tested: {progress.times_tested}")
    print(f"  Times Correct: {progress.times_correct}")
    print(f"  Pass Rate: {progress.times_correct}/{progress.times_tested} ({int(progress.times_correct/progress.times_tested*100)}%)")
    print(f"  Last Tested: {progress.last_tested.strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Get test history
    print("→ Test history (newest first):\n")
    history = store.get_test_history(verse_id=verse.id)
    for i, result in enumerate(history, 1):
        status = "✓ PASS" if result.passed else "✗ FAIL"
        score_str = f"{int(result.score*100)}%" if result.score is not None else "No score"
        print(f"  {i}. {status} - {score_str}")
        print(f"     Timestamp: {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Test with limit
    print("→ Getting last 2 test results:\n")
    recent = store.get_test_history(verse_id=verse.id, limit=2)
    print(f"  Returned {len(recent)} results")
    for result in recent:
        status = "Pass" if result.passed else "Fail"
        print(f"    • {status}: {int(result.score*100) if result.score else 'N/A'}%\n")

    # Test recording without score
    print("→ Recording a pass/fail-only test (no score):\n")
    result_simple = store.record_test_result(verse.id, passed=True)
    print(f"  Simple test recorded: Passed")
    print(f"  Score: {result_simple.score}\n")

    # Add another verse and demonstrate cross-verse history
    print("→ Adding another verse and recording tests:\n")
    psalm = store.add_verse(
        reference="Psalm 23:1",
        text="The Lord is my shepherd, I lack nothing.",
        translation="NIV"
    )

    store.record_test_result(psalm.id, passed=True, score=0.90)
    store.record_test_result(psalm.id, passed=True, score=0.95)
    print(f"  Recorded 2 tests for {psalm.reference}\n")

    # Get all test history across verses
    print("→ All test history (across all verses, newest first):\n")
    all_history = store.get_test_history()
    print(f"  Total tests recorded: {len(all_history)}\n")
    for i, result in enumerate(all_history[:5], 1):  # Show first 5
        verse_ref = store.get_verse(result.verse_id).reference
        status = "✓" if result.passed else "✗"
        score_str = f"{int(result.score*100)}%" if result.score else "Pass/Fail"
        print(f"    {i}. {status} {verse_ref}: {score_str}")
    if len(all_history) > 5:
        print(f"    ... and {len(all_history) - 5} more")
    print()

    return store


def demo_progress_tracking():
    """Demonstrate progress tracking functionality"""
    print_section("8. PROGRESS TRACKING - Recording Practice and Comfort Levels")

    # Create a fresh store for this demo
    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    # Add a verse
    verse = store.add_verse(
        reference="Psalm 23:1",
        text="The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures...",
        translation="NIV"
    )
    print(f"→ Added verse: {verse.reference}\n")

    # Check initial progress (should be None)
    print("→ Checking initial progress (before any practice):\n")
    progress = store.get_progress(verse.id)
    print_progress(progress, show_all=False)

    # Record some practice sessions
    print("→ Recording 3 practice sessions:\n")
    for i in range(1, 4):
        store.record_practice(verse.id)
        progress = store.get_progress(verse.id)
        print(f"  Session {i}:")
        print_progress(progress, show_all=False)
        time.sleep(0.1)  # Small delay to show progression

    # Set comfort level
    print("→ After practicing, setting comfort level to 3/5:\n")
    store.set_comfort_level(verse.id, 3)
    progress = store.get_progress(verse.id)
    print_progress(progress, show_all=False)

    # Practice more and increase comfort
    print("→ More practice and increasing comfort level to 4/5:\n")
    store.record_practice(verse.id)
    store.record_practice(verse.id)
    store.set_comfort_level(verse.id, 4)
    progress = store.get_progress(verse.id)
    print_progress(progress, show_all=False)

    # Demonstrate resetting progress
    print("→ Resetting progress to start over:\n")
    print(f"  Before reset - Times Practiced: {progress.times_practiced}, Comfort: {progress.comfort_level}")
    store.reset_progress(verse.id)
    progress = store.get_progress(verse.id)
    print(f"  After reset - Times Practiced: {progress.times_practiced}, Comfort: {progress.comfort_level}\n")

    return store


def demo_statistics():
    """Demonstrate statistics functionality"""
    print_section("10. STATISTICS - Overall and Per-Verse Analytics")

    # Create a fresh store for this demo
    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    # Add multiple verses and build up some stats
    print("→ Adding verses and recording practice/test data...\n")

    john = store.add_verse(
        reference="John 3:16",
        text="For God so loved the world that he gave his one and only Son...",
        translation="NIV"
    )
    print(f"  Added: {john.reference}")

    psalm = store.add_verse(
        reference="Psalm 23:1",
        text="The Lord is my shepherd, I lack nothing...",
        translation="NIV"
    )
    print(f"  Added: {psalm.reference}")

    romans = store.add_verse(
        reference="Romans 3:23",
        text="For all have sinned and fall short of the glory of God...",
        translation="KJV"
    )
    print(f"  Added: {romans.reference}\n")

    # Record practice and test data
    print("→ Recording practice and test sessions:\n")

    # John - lots of practice and tests
    for _ in range(5):
        store.record_practice(john.id)
    store.set_comfort_level(john.id, 5)
    store.record_test_result(john.id, passed=True, score=0.95)
    store.record_test_result(john.id, passed=True, score=0.98)
    store.record_test_result(john.id, passed=True, score=0.92)
    print(f"  {john.reference}: 5 practices, 3 tests (all passed), comfort 5/5")

    # Psalm - medium practice and mixed results
    for _ in range(3):
        store.record_practice(psalm.id)
    store.set_comfort_level(psalm.id, 3)
    store.record_test_result(psalm.id, passed=True, score=0.85)
    store.record_test_result(psalm.id, passed=False, score=0.60)
    store.record_test_result(psalm.id, passed=True, score=0.80)
    print(f"  {psalm.reference}: 3 practices, 3 tests (2 passed), comfort 3/5")

    # Romans - minimal interaction
    store.record_practice(romans.id)
    store.set_comfort_level(romans.id, 2)
    store.record_test_result(romans.id, passed=False, score=0.45)
    print(f"  {romans.reference}: 1 practice, 1 test (failed), comfort 2/5\n")

    # Get overall stats
    print("→ OVERALL STATISTICS:\n")
    overall = store.get_stats()

    print(f"  Verses Active: {overall['total_verses']}")
    print(f"  Verses Archived: {overall['total_archived']}")
    print(f"  Total Practice Sessions: {overall['total_practiced']}")
    print(f"  Total Tests: {overall['total_tested']}")
    print(f"  Total Correct: {overall['total_correct']}")
    print(f"  Overall Accuracy: {overall['overall_accuracy']*100:.1f}%")
    print(f"  Verses at Perfect Comfort (5/5): {overall['verses_with_perfect_comfort']}")
    print(f"  Average Comfort Level: {overall['average_comfort_level']:.2f}/5\n")

    # Get per-verse stats
    print("→ PER-VERSE STATISTICS:\n")

    for verse in [john, psalm, romans]:
        stats = store.get_verse_stats(verse.id)
        print(f"  {verse.reference}:")
        print(f"    - Times Practiced: {stats['times_practiced']}")
        print(f"    - Times Tested: {stats['times_tested']}")
        print(f"    - Times Correct: {stats['times_correct']}")
        if stats['times_tested'] > 0:
            print(f"    - Accuracy: {stats['accuracy']*100:.1f}%")
        else:
            print(f"    - Accuracy: N/A (no tests)")
        print(f"    - Comfort Level: {stats['comfort_level']}/5")
        print(f"    - Consecutive Correct: {stats['consecutive_correct']}")
        if stats['last_tested']:
            last_tested = stats['last_tested'].split('T')[0]  # Extract date
            print(f"    - Last Tested: {last_tested}")
        print()

    # Archive a verse and show how stats change
    print("→ Archiving John 3:16 and rechecking stats:\n")
    store.archive_verse(john.id)

    overall = store.get_stats()
    print(f"  Verses Active: {overall['total_verses']} (was 3)")
    print(f"  Verses Archived: {overall['total_archived']} (was 0)")
    print(f"  Overall Accuracy: {overall['overall_accuracy']*100:.1f}% (from remaining verses)")
    print(f"  Average Comfort Level: {overall['average_comfort_level']:.2f}/5\n")

    return store


def main():
    """Run all demonstrations"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*68 + "║")
    print("║" + "  MEMORY MATE PROTOTYPE - DEMONSTRATION".center(68) + "║")
    print("║" + "  Verse Management System".center(68) + "║")
    print("║" + " "*68 + "║")
    print("╚" + "="*68 + "╝")

    try:
        # Run all demos
        store = demo_basic_operations()
        demo_update_operations(store)
        demo_archive_operations(store)
        demo_remove_operations(store)
        store = demo_persistence(store)
        demo_verse_lookup()
        demo_error_handling()
        demo_data_model()
        demo_progress_tracking()
        demo_test_results()
        demo_statistics()

        print_section("DEMO COMPLETE")
        print("✓ All demonstrations completed successfully!\n")
        print("Summary of demonstrated capabilities:")
        print("  • Creating and retrieving verses")
        print("  • Updating verse information")
        print("  • Archiving and unarchiving verses")
        print("  • Removing verses")
        print("  • Recording practice sessions")
        print("  • Setting comfort levels (1-5 scale)")
        print("  • Viewing progress metrics")
        print("  • Recording test attempts with scores")
        print("  • Retrieving test history with filtering and limits")
        print("  • Resetting progress (cascade deletes test results)")
        print("  • Getting overall statistics (across all verses)")
        print("  • Getting per-verse statistics (accuracy, comfort, consecutive streak)")
        print("  • Persisting data to JSON storage")
        print("  • Loading data from storage (simulating app restart)")
        print("  • Error handling for edge cases")
        print("  • Verse, progress, and test data model serialization/deserialization\n")

    except Exception as e:
        print(f"\n❌ Error during demo: {e}")
        raise


if __name__ == "__main__":
    main()
