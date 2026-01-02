"""
Demo script showcasing Memory Mate prototype capabilities

This script demonstrates the current functionality of the Verse data model
and MemoryMateStore class, including verse management and persistence.
"""

from memory_mate import MemoryMateStore
import json


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


def demo_basic_operations():
    """Demonstrate basic CRUD operations"""
    print_section("1. BASIC OPERATIONS - Adding and Retrieving Verses")

    # Create a store
    store = MemoryMateStore(storage_path="demo_memory_mate_data.json")

    # Add some verses
    print("→ Adding 3 Bible verses to the store...\n")

    john = store.add_verse(
        reference="John 3:16",
        text="For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
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
    print_section("8. DATA MODEL - Verse Structure")

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

        print_section("DEMO COMPLETE")
        print("✓ All demonstrations completed successfully!\n")
        print("Summary of demonstrated capabilities:")
        print("  • Creating and retrieving verses")
        print("  • Updating verse information")
        print("  • Archiving and unarchiving verses")
        print("  • Removing verses")
        print("  • Persisting data to JSON storage")
        print("  • Loading data from storage (simulating app restart)")
        print("  • Error handling for edge cases")
        print("  • Verse data model serialization/deserialization\n")

    except Exception as e:
        print(f"\n❌ Error during demo: {e}")
        raise


if __name__ == "__main__":
    main()
