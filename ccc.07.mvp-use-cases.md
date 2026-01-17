# MVP Use Cases - Memory Mate 2026

This document defines the use cases for the Memory Mate MVP (Minimum Viable Product). These use cases describe the core functionality that must be implemented for initial release.

---

## Overview

The MVP enables users to:
1. **Manage** a personal collection of verses
2. **Practice** verses to build familiarity
3. **Test** recall and track performance
4. **Review** progress and statistics

All data is stored locally on the device (no backend/sync in MVP).

---

## Actors

| Actor | Description |
|-------|-------------|
| **User** | Primary actor - a person memorizing Bible verses |
| **System** | The Memory Mate app (automated behaviors) |

---

## Use Case Categories

### 1. Verse Management
- [UC-1.1](#uc-11-add-a-new-verse) Add a New Verse
- [UC-1.2](#uc-12-view-verse-list) View Verse List
- [UC-1.3](#uc-13-view-verse-details) View Verse Details
- [UC-1.4](#uc-14-edit-a-verse) Edit a Verse
- [UC-1.5](#uc-15-archive-a-verse) Archive a Verse
- [UC-1.6](#uc-16-unarchive-a-verse) Unarchive a Verse
- [UC-1.7](#uc-17-delete-a-verse) Delete a Verse

### 2. Practice Mode
- [UC-2.1](#uc-21-start-practice-session) Start Practice Session
- [UC-2.2](#uc-22-practice-a-verse) Practice a Verse
- [UC-2.3](#uc-23-set-comfort-level) Set Comfort Level

### 3. Test Mode
- [UC-3.1](#uc-31-start-test-session) Start Test Session
- [UC-3.2](#uc-32-take-a-verse-test) Take a Verse Test
- [UC-3.3](#uc-33-view-test-results) View Test Results

### 4. Progress & Statistics
- [UC-4.1](#uc-41-view-overall-statistics) View Overall Statistics
- [UC-4.2](#uc-42-view-verse-statistics) View Verse Statistics
- [UC-4.3](#uc-43-reset-verse-progress) Reset Verse Progress

---

## Detailed Use Cases

---

### UC-1.1: Add a New Verse

**Goal**: User adds a Bible verse to their collection for memorization.

**Preconditions**: User is on the Add Verse screen.

**Main Flow**:
1. User enters the verse reference (e.g., "John 3:16")
2. User enters the verse text
3. User selects the translation (e.g., NIV, ESV, KJV)
4. User taps "Save" button
5. System validates the input
6. System creates a new Verse record with unique ID and timestamp
7. System saves to local storage
8. System displays success confirmation
9. System navigates to the verse list or verse detail

**Alternative Flows**:
- **A1**: Empty reference or text
  - System displays validation error
  - User corrects input and retries
- **A2**: User cancels
  - System discards input
  - System returns to previous screen

**Postconditions**:
- New verse is persisted in local storage
- Verse appears in the verse list

**UI Elements**:
- Text input for reference
- Multi-line text input for verse text
- Dropdown/picker for translation
- Save and Cancel buttons

---

### UC-1.2: View Verse List

**Goal**: User views their collection of verses.

**Preconditions**: User is on the Home or Verses tab.

**Main Flow**:
1. System retrieves all active (non-archived) verses
2. System displays verses in a scrollable list
3. Each list item shows:
   - Verse reference
   - Translation badge
   - Preview of verse text (truncated)
   - Comfort level indicator (optional)
4. User can tap a verse to view details

**Alternative Flows**:
- **A1**: No verses exist
  - System displays empty state with "Add your first verse" prompt
- **A2**: User wants to see archived verses
  - User toggles "Show Archived" option
  - System includes archived verses (visually distinguished)

**Postconditions**: User sees their verse collection.

**UI Elements**:
- Scrollable list/FlatList
- Verse cards with reference, translation, preview
- Empty state illustration and CTA
- Filter/toggle for archived verses

---

### UC-1.3: View Verse Details

**Goal**: User views full details of a specific verse.

**Preconditions**: User has selected a verse from the list.

**Main Flow**:
1. System retrieves verse data and associated progress
2. System displays:
   - Full verse reference
   - Complete verse text
   - Translation
   - Created date
   - Progress summary (times practiced, tested, accuracy)
   - Comfort level
3. User can access actions: Practice, Test, Edit, Archive, Delete

**Alternative Flows**:
- **A1**: Verse has no progress data
  - System shows "Not yet practiced" status
  - Comfort level shows as 1 (default)

**Postconditions**: User sees complete verse information.

**UI Elements**:
- Verse reference (large text)
- Verse text (readable font size)
- Translation badge
- Progress stats card
- Action buttons (Practice, Test, Edit, More...)

---

### UC-1.4: Edit a Verse

**Goal**: User modifies an existing verse's reference, text, or translation.

**Preconditions**: User is viewing verse details or has selected Edit.

**Main Flow**:
1. System displays current verse data in editable form
2. User modifies desired fields
3. User taps "Save" button
4. System validates input
5. System updates the verse record
6. System saves to local storage
7. System displays success confirmation

**Alternative Flows**:
- **A1**: Validation fails - same as UC-1.1 A1
- **A2**: User cancels - changes discarded

**Postconditions**: Verse is updated in local storage.

**Notes**: Editing a verse does NOT reset progress or test history.

---

### UC-1.5: Archive a Verse

**Goal**: User removes a verse from active practice without deleting it.

**Preconditions**: User is viewing verse details or list.

**Main Flow**:
1. User selects "Archive" action
2. System prompts for confirmation (optional)
3. System sets verse.archived = true
4. System saves to local storage
5. Verse is hidden from active verse list
6. System displays confirmation

**Alternative Flows**:
- **A1**: User cancels confirmation
  - No changes made

**Postconditions**:
- Verse is archived
- Verse hidden from default list view
- Progress and test history preserved

**Notes**: Archived verses can be viewed with "Show Archived" toggle.

---

### UC-1.6: Unarchive a Verse

**Goal**: User restores an archived verse to active status.

**Preconditions**: User is viewing an archived verse.

**Main Flow**:
1. User selects "Unarchive" action
2. System sets verse.archived = false
3. System saves to local storage
4. Verse appears in active verse list
5. System displays confirmation

**Postconditions**: Verse is active again with all progress intact.

---

### UC-1.7: Delete a Verse

**Goal**: User permanently removes a verse and all associated data.

**Preconditions**: User is viewing verse details.

**Main Flow**:
1. User selects "Delete" action
2. System displays warning: "This will permanently delete the verse and all practice/test history. This cannot be undone."
3. User confirms deletion
4. System performs cascade delete:
   - Deletes Verse record
   - Deletes associated VerseProgress
   - Deletes all associated TestResults
5. System saves to local storage
6. System navigates to verse list

**Alternative Flows**:
- **A1**: User cancels
  - No changes made

**Postconditions**: Verse and all associated data permanently removed.

**Notes**: This is a destructive action requiring clear confirmation.

---

### UC-2.1: Start Practice Session

**Goal**: User begins a practice session with one or more verses.

**Preconditions**: User has at least one active verse.

**Main Flow**:
1. User navigates to Practice tab/screen
2. System displays practice options:
   - Practice all verses
   - Practice verses by comfort level (e.g., "Needs Work" = 1-2)
   - Practice specific verse(s)
3. User selects practice mode
4. System retrieves applicable verses
5. System begins practice flow (UC-2.2)

**Alternative Flows**:
- **A1**: No verses available
  - System displays "Add verses first" message
- **A2**: User selects specific verse from detail screen
  - System starts single-verse practice

**Postconditions**: Practice session initiated.

**UI Elements**:
- Practice mode selection (cards or buttons)
- Verse count indicators
- "Start Practice" button

---

### UC-2.2: Practice a Verse

**Goal**: User reviews a verse to build familiarity.

**Preconditions**: Practice session is active.

**Main Flow**:
1. System displays verse reference
2. User attempts to recall the verse
3. User taps "Reveal" to see the full text
4. System shows complete verse text
5. User reviews and self-assesses
6. System records practice activity:
   - Increments times_practiced
   - Updates last_practiced timestamp
7. User proceeds to next verse or ends session

**Alternative Flows**:
- **A1**: User wants hint
  - System shows first few words
- **A2**: User skips verse
  - No practice recorded for this verse
- **A3**: Single verse practice
  - Session ends after one verse

**Postconditions**:
- Practice activity recorded
- Progress updated in storage

**UI Elements**:
- Reference display (prominent)
- Hidden/revealed verse text
- Reveal button
- Hint button (optional)
- Next/Done buttons
- Progress indicator (X of Y verses)

---

### UC-2.3: Set Comfort Level

**Goal**: User self-assesses their comfort with a verse.

**Preconditions**: User is viewing verse details or completing practice.

**Main Flow**:
1. System displays comfort level scale (1-5):
   - 1 = New / Not Started
   - 2 = Learning
   - 3 = Getting Familiar
   - 4 = Almost There
   - 5 = Memorized
2. User selects comfort level
3. System updates VerseProgress.comfort_level
4. System saves to local storage

**Alternative Flows**:
- **A1**: Comfort level already set
  - System shows current level as selected
  - User can change to new level

**Postconditions**: Comfort level updated and persisted.

**UI Elements**:
- 5-point rating scale (stars, slider, or buttons)
- Labels for each level
- Current selection highlighted

---

### UC-3.1: Start Test Session

**Goal**: User begins a test session to evaluate recall.

**Preconditions**: User has at least one active verse.

**Main Flow**:
1. User navigates to Test tab/screen
2. System displays test options:
   - Test all verses
   - Test verses due for review
   - Test specific verse(s)
   - Quick test (random selection)
3. User selects test mode
4. System retrieves applicable verses
5. System begins test flow (UC-3.2)

**Alternative Flows**:
- **A1**: No verses available
  - System displays "Add verses first" message

**Postconditions**: Test session initiated.

**UI Elements**:
- Test mode selection
- Estimated duration/count
- "Start Test" button

---

### UC-3.2: Take a Verse Test

**Goal**: User tests their recall of a verse.

**Preconditions**: Test session is active.

**Main Flow**:
1. System displays verse reference
2. User types/recites the verse from memory
3. User taps "Check" or "Done"
4. System reveals correct text
5. System displays comparison (user input vs. actual)
6. User marks result as Pass or Fail
7. System calculates score (optional - based on word accuracy)
8. System records test result:
   - Creates TestResult record
   - Updates VerseProgress (times_tested, times_correct, last_tested)
9. User proceeds to next verse or ends session

**Alternative Flows**:
- **A1**: User gives up
  - System reveals answer
  - Test recorded as failed
- **A2**: User skips verse
  - No test recorded for this verse
- **A3**: Voice input mode (future)
  - User speaks verse
  - System transcribes and compares

**Postconditions**:
- TestResult created with pass/fail and optional score
- Progress counters updated

**UI Elements**:
- Reference display
- Text input area (multi-line)
- Check/Submit button
- Give Up button
- Side-by-side comparison view
- Pass/Fail buttons
- Score display (if calculated)
- Next/Done buttons

---

### UC-3.3: View Test Results

**Goal**: User reviews their test history for a verse.

**Preconditions**: User is viewing verse details.

**Main Flow**:
1. System retrieves test history for the verse
2. System displays list of past tests (newest first):
   - Date/time of test
   - Pass/Fail status
   - Score (if available)
3. User can scroll through history

**Alternative Flows**:
- **A1**: No test history
  - System shows "No tests yet" message

**Postconditions**: User sees test history.

**UI Elements**:
- Scrollable list of test results
- Pass/fail indicators (green/red)
- Score display
- Timestamps

---

### UC-4.1: View Overall Statistics

**Goal**: User sees aggregate statistics across all verses.

**Preconditions**: User navigates to Stats/Dashboard screen.

**Main Flow**:
1. System calculates overall statistics:
   - Total active verses
   - Total archived verses
   - Total practice sessions
   - Total tests taken
   - Overall accuracy (% correct)
   - Verses at each comfort level
   - Average comfort level
2. System displays statistics dashboard

**Alternative Flows**:
- **A1**: No data yet
  - System shows zeros with encouraging message

**Postconditions**: User sees overall progress summary.

**UI Elements**:
- Stats cards (large numbers)
- Accuracy percentage (prominent)
- Comfort level distribution (chart/bars)
- Verses count badges

---

### UC-4.2: View Verse Statistics

**Goal**: User sees detailed statistics for a specific verse.

**Preconditions**: User is viewing verse details.

**Main Flow**:
1. System retrieves verse-specific statistics:
   - Times practiced
   - Times tested
   - Times correct
   - Accuracy percentage
   - Current comfort level
   - Last practiced date
   - Last tested date
   - Consecutive correct streak
2. System displays stats within verse detail view

**Postconditions**: User sees verse-specific progress.

**UI Elements**:
- Stats section in verse detail
- Key metrics displayed
- Trend indicators (optional)

---

### UC-4.3: Reset Verse Progress

**Goal**: User clears all progress data for a verse to start fresh.

**Preconditions**: User is viewing verse details with existing progress.

**Main Flow**:
1. User selects "Reset Progress" action
2. System displays warning: "This will reset all practice and test history for this verse. The verse itself will not be deleted."
3. User confirms reset
4. System performs cascade reset:
   - Resets VerseProgress to defaults (times_practiced=0, etc.)
   - Deletes all TestResults for this verse
5. System saves to local storage
6. System displays confirmation

**Alternative Flows**:
- **A1**: User cancels
  - No changes made

**Postconditions**:
- Progress reset to initial state
- Test history cleared
- Verse itself unchanged

**Notes**: This allows users to re-learn a verse without deleting it.

---

## Non-Functional Requirements

### Performance
- App should load within 2 seconds
- Verse list should scroll smoothly with 100+ verses
- Statistics should calculate within 500ms

### Data Persistence
- All data stored locally using SQLite
- Data persists across app restarts
- No data loss on normal app termination

### Offline Support
- App functions fully offline (no network required for MVP)
- All features available without internet connection

### Platform Support
- iOS (iPhone and iPad)
- Android (phones and tablets)
- Web (responsive design)

---

## Out of Scope for MVP

The following are explicitly NOT included in MVP:

1. **User accounts / authentication**
2. **Cloud sync / backup**
3. **Multi-device sync**
4. **Sharing / social features**
5. **Spaced repetition algorithm**
6. **AI-powered features**
7. **Voice input/output**
8. **Bible API integration** (manual entry only)
9. **Verse organization** (shelves/books)
10. **Export/import functionality**

These may be added in future versions.

---

## Screen Summary

Based on the use cases, the MVP requires these screens:

| Screen | Primary Use Cases |
|--------|-------------------|
| **Home/Dashboard** | UC-4.1, entry to other features |
| **Verse List** | UC-1.2 |
| **Verse Detail** | UC-1.3, UC-1.4, UC-1.5, UC-1.6, UC-1.7, UC-4.2, UC-4.3 |
| **Add Verse** | UC-1.1 |
| **Edit Verse** | UC-1.4 |
| **Practice** | UC-2.1, UC-2.2, UC-2.3 |
| **Test** | UC-3.1, UC-3.2, UC-3.3 |
| **Settings** | App preferences (future) |

### Suggested Tab Navigation

1. **Home** - Dashboard with stats and quick actions
2. **Verses** - Verse list and management
3. **Practice** - Practice mode
4. **Test** - Test mode
5. **Settings** - App configuration

---

## Relationship to Prototype

The Python prototype (`memory_mate.py`) implements the data layer for these use cases:

| Use Case | Prototype Method(s) |
|----------|---------------------|
| UC-1.1 Add Verse | `add_verse()` |
| UC-1.2 View List | `get_all_verses()` |
| UC-1.3 View Details | `get_verse()`, `get_progress()`, `get_verse_stats()` |
| UC-1.4 Edit Verse | `update_verse()` |
| UC-1.5 Archive | `archive_verse()` |
| UC-1.6 Unarchive | `unarchive_verse()` |
| UC-1.7 Delete | `remove_verse()` |
| UC-2.2 Practice | `record_practice()` |
| UC-2.3 Comfort Level | `set_comfort_level()` |
| UC-3.2 Test | `record_test_result()` |
| UC-3.3 Test History | `get_test_history()` |
| UC-4.1 Overall Stats | `get_stats()` |
| UC-4.2 Verse Stats | `get_verse_stats()` |
| UC-4.3 Reset Progress | `reset_progress()` |

---

**Document Version**: 1.0
**Created**: 2026-01-17
**Author**: Claude Code
