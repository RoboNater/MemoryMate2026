# MVP Phase 5 Task 1: Complete Practice Flow - Detailed Implementation Plan

**Document Version**: 1.0
**Created**: 2026-02-07
**Author**: Claude Code
**Status**: Ready for Implementation

---

## Executive Summary

This document outlines the detailed implementation plan for **Phase 5 Task 1: Complete Practice Flow**, which will enable users to practice multiple verses in a single session with progress tracking and session summaries.

### Current State

**What Works:**
- ✅ Practice selection screen shows "Practice All" and "Needs Work" options
- ✅ Individual verse practice screen fully functional (reveal, comfort level, save progress)
- ✅ Database persistence for practice sessions (times_practiced, comfort_level, last_practiced)
- ✅ Progress tracking in Zustand store

**Current Limitations:**
- ⚠️ "Practice All" and "Needs Work" buttons only navigate to the FIRST verse
- ⚠️ No way to progress through multiple verses sequentially
- ⚠️ No session summary at the end of practice
- ⚠️ No session state management (user loses progress if they navigate away)

**Code Comments Indicating Planned Work:**
```typescript
// From practice.tsx line 16-17:
// For multi-verse practice, we'll just navigate to the first verse
// In Phase 4, we can implement a proper session manager
```

---

## Goals & Objectives

### Primary Goals
1. **Multi-verse sessions**: Users can practice multiple verses sequentially in one session
2. **Session navigation**: Clear "Next" and "Previous" buttons to move through verses
3. **Session summary**: End-of-session summary showing what was practiced
4. **Progress tracking**: Track completion within session (e.g., "3 of 5 verses practiced")

### Success Criteria
- [ ] User can select multiple verses and practice them all in sequence
- [ ] Session state persists as user moves between verses
- [ ] User sees clear progress indicators (e.g., "Verse 2 of 5")
- [ ] End-of-session summary shows all verses practiced with comfort levels
- [ ] User can exit session early and return to practice selection
- [ ] All practice data is saved to database correctly

### Non-Goals (Deferred to Later)
- ❌ Spaced repetition algorithms (future enhancement)
- ❌ Customizable session ordering (future enhancement)
- ❌ Session pause/resume across app restarts (nice-to-have, not MVP)

---

## Architecture Overview

### Approach: URL-Based Session State

We'll use **query parameters in the URL** to manage session state, similar to how many web apps handle multi-step flows. This approach is:
- ✅ Simple and idiomatic for Expo Router
- ✅ Shareable (could share a practice session URL)
- ✅ No need for complex state management
- ✅ Works well with React Native's navigation stack

### Session Flow

```
Practice Selection Screen
  ↓
  User clicks "Practice All" (5 verses)
  ↓
Navigate to /practice/session?ids=uuid1,uuid2,uuid3,uuid4,uuid5&index=0
  ↓
Practice Session Screen (shows verse 1 of 5)
  ↓
  User reveals, sets comfort level, clicks "Next"
  ↓
Navigate to /practice/session?ids=uuid1,uuid2,uuid3,uuid4,uuid5&index=1
  ↓
Practice Session Screen (shows verse 2 of 5)
  ↓
  ... continues through all verses ...
  ↓
After last verse, navigate to /practice/summary?ids=uuid1,uuid2,uuid3,uuid4,uuid5
  ↓
Practice Summary Screen (shows all verses practiced)
  ↓
User clicks "Done", navigate back to /(tabs)/practice
```

### File Structure

**New Files to Create:**
```
memory-mate-mvp/src/app/practice/
├── session.tsx           # NEW - Multi-verse practice session screen
└── summary.tsx           # NEW - End-of-session summary screen
```

**Files to Modify:**
```
memory-mate-mvp/src/app/(tabs)/practice.tsx    # Update to navigate to session
```

**No Changes Required:**
```
memory-mate-mvp/src/app/practice/[id].tsx      # Keep for direct individual practice
memory-mate-mvp/src/services/*                 # All services already support what we need
memory-mate-mvp/src/store/verseStore.ts        # Already has all methods we need
```

---

## Detailed Implementation Plan

### Task 1: Modify Practice Selection Screen

**File**: `memory-mate-mvp/src/app/(tabs)/practice.tsx`

**Changes**:
1. Update `startPractice()` function to navigate to session screen with all verse IDs
2. Pass verse IDs as comma-separated query parameter

**Implementation**:
```typescript
const startPractice = (verses: typeof activeVerses) => {
  if (verses.length === 0) return;

  // For single verse, navigate to individual practice screen
  if (verses.length === 1) {
    router.push(`/practice/${verses[0].id}`);
    return;
  }

  // For multiple verses, navigate to session screen
  const verseIds = verses.map(v => v.id).join(',');
  router.push(`/practice/session?ids=${verseIds}&index=0`);
};
```

**Testing**:
- [ ] Click "Practice All" with 1 verse → should go to individual screen
- [ ] Click "Practice All" with 2+ verses → should go to session screen
- [ ] Click "Needs Work" with multiple verses → should go to session screen

**Effort**: Small (~5 minutes)

---

### Task 2: Create Practice Session Screen

**File**: `memory-mate-mvp/src/app/practice/session.tsx` (NEW)

**Purpose**: Display one verse at a time from a session of multiple verses, with navigation between them.

**Query Parameters**:
- `ids`: Comma-separated list of verse UUIDs (e.g., "uuid1,uuid2,uuid3")
- `index`: Current index in the session (0-based, e.g., 0, 1, 2)

**State Management**:
```typescript
// Parse query params
const { ids, index } = useLocalSearchParams<{ ids: string; index: string }>();
const verseIds = ids ? ids.split(',') : [];
const currentIndex = parseInt(index || '0', 10);
const currentVerseId = verseIds[currentIndex];

// Local state for current verse
const [revealed, setRevealed] = useState(false);
const [comfortLevel, setComfortLevel] = useState<1 | 2 | 3 | 4 | 5>(1);

// Session state tracking (for summary later)
const [sessionResults, setSessionResults] = useState<{
  verseId: string;
  practiced: boolean;
  comfortLevel: number | null;
}[]>([]);
```

**UI Components**:

1. **Session Progress Indicator** (top of screen)
   ```
   ┌─────────────────────────────────────┐
   │  Verse 2 of 5                       │
   │  ████████░░░░░░░ 40%                │
   └─────────────────────────────────────┘
   ```

2. **Verse Display** (same as individual practice)
   - Reference card
   - Instructions (before reveal)
   - Reveal button
   - Verse text (after reveal)
   - Comfort level picker (after reveal)

3. **Session Navigation Buttons**
   - **Previous** button (disabled on first verse)
   - **Next** button (enabled after reveal, or "Skip" if not revealed)
   - **Exit Session** button (with confirmation)

**Navigation Logic**:
```typescript
const handleNext = async () => {
  // Save progress for current verse if revealed
  if (revealed) {
    await recordPractice(currentVerseId);
    await setComfortLevelAction(currentVerseId, comfortLevel);
  }

  // Move to next verse
  const nextIndex = currentIndex + 1;

  if (nextIndex >= verseIds.length) {
    // End of session - go to summary
    router.push(`/practice/summary?ids=${ids}`);
  } else {
    // Navigate to next verse
    router.push(`/practice/session?ids=${ids}&index=${nextIndex}`);
  }
};

const handlePrevious = () => {
  const prevIndex = currentIndex - 1;
  if (prevIndex >= 0) {
    router.push(`/practice/session?ids=${ids}&index=${prevIndex}`);
  }
};

const handleExitSession = () => {
  Alert.alert(
    'Exit Practice Session?',
    'Your progress has been saved for verses you completed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => router.push('/(tabs)/practice') }
    ]
  );
};
```

**Error Handling**:
```typescript
// Invalid query params
if (!ids || verseIds.length === 0) {
  return <ErrorDisplay message="Invalid session. Please start a new practice session." />;
}

// Invalid index
if (currentIndex < 0 || currentIndex >= verseIds.length) {
  return <ErrorDisplay message="Invalid verse in session." />;
}

// Verse not found
const verse = verses.find(v => v.id === currentVerseId);
if (!verse) {
  return <ErrorDisplay message="Verse not found in your collection." />;
}
```

**Accessibility**:
- Screen reader announces "Verse X of Y"
- Large touch targets for navigation buttons
- Clear labels for all interactive elements

**Testing**:
- [ ] Session with 3 verses navigates correctly (1→2→3→summary)
- [ ] Previous button works correctly
- [ ] Progress bar updates correctly
- [ ] Comfort level persists when going back to previous verse
- [ ] Exit session prompts for confirmation
- [ ] All practice data saves to database

**Effort**: Medium (~2-3 hours)

---

### Task 3: Create Practice Summary Screen

**File**: `memory-mate-mvp/src/app/practice/summary.tsx` (NEW)

**Purpose**: Show summary of completed practice session with statistics.

**Query Parameters**:
- `ids`: Comma-separated list of verse UUIDs practiced in this session

**Data Loading**:
```typescript
const { ids } = useLocalSearchParams<{ ids: string }>();
const verseIds = ids ? ids.split(',') : [];
const { verses, progress } = useVerseStore();

// Get verses that were in this session
const sessionVerses = verseIds
  .map(id => verses.find(v => v.id === id))
  .filter((v): v is Verse => v !== undefined);
```

**UI Components**:

1. **Session Complete Header**
   ```
   ┌─────────────────────────────────────┐
   │  ✓ Practice Session Complete!       │
   │  You practiced 5 verses              │
   └─────────────────────────────────────┘
   ```

2. **Verse Summary Cards** (scrollable list)
   ```
   ┌─────────────────────────────────────┐
   │  John 3:16                          │
   │  Comfort Level: ●●●●○ (4)           │
   │  Practiced 3 times total            │
   └─────────────────────────────────────┘
   ```

3. **Session Statistics**
   ```
   ┌─────────────────────────────────────┐
   │  Session Stats:                     │
   │  • Total verses: 5                  │
   │  • Average comfort: 3.4             │
   │  • Time: ~12 minutes (optional)     │
   └─────────────────────────────────────┘
   ```

4. **Action Buttons**
   - **Practice Again** (restart same session)
   - **Done** (return to practice selection)

**Implementation**:
```typescript
const handlePracticeAgain = () => {
  // Restart session from beginning
  router.push(`/practice/session?ids=${ids}&index=0`);
};

const handleDone = () => {
  // Return to practice tab
  router.push('/(tabs)/practice');
};

const calculateAverageComfort = () => {
  const comfortLevels = sessionVerses
    .map(v => progress[v.id]?.comfort_level || 1)
    .filter(Boolean);

  if (comfortLevels.length === 0) return 0;
  return (comfortLevels.reduce((a, b) => a + b, 0) / comfortLevels.length).toFixed(1);
};
```

**Visual Design**:
- Success theme (green accents)
- Celebratory feel (checkmarks, positive messaging)
- Clear statistics presentation
- Comfortable reading layout

**Testing**:
- [ ] Summary shows all verses from session
- [ ] Comfort levels display correctly
- [ ] "Practice Again" restarts session
- [ ] "Done" returns to practice tab
- [ ] Average comfort level calculates correctly
- [ ] Empty session (user exited early) displays appropriately

**Effort**: Small-Medium (~1-2 hours)

---

### Task 4: Update Individual Practice Screen (Optional Enhancement)

**File**: `memory-mate-mvp/src/app/practice/[id].tsx`

**Purpose**: Distinguish between single-verse practice and session practice.

**Changes** (optional, for consistency):
1. Add a "Practice More" button at the end to start a new session
2. Update "Done" button text to be more clear ("Finish & Return")

**Implementation**:
```typescript
// In handleDone function, could add:
const handleDone = async () => {
  if (revealed) {
    await handleSaveProgress();
  }
  router.push('/(tabs)/practice');
};

// Optional: Add "Practice More" button
const handlePracticeMore = () => {
  router.push('/(tabs)/practice');
};
```

**Effort**: Tiny (~10 minutes) - **Optional, can defer**

---

## Visual Design Specifications

### Session Progress Indicator

**Location**: Top of session screen, below header
**Elements**:
- Text: "Verse X of Y"
- Progress bar (visual representation)
- Percentage (optional)

**Colors**:
- Progress bar filled: green-500 (#10b981)
- Progress bar empty: gray-200 (#e5e7eb)
- Text: gray-700 (#374151)

**Code**:
```typescript
<View className="bg-white p-4 border-b border-gray-200">
  <View className="flex-row items-center justify-between mb-2">
    <Text className="text-lg font-semibold text-gray-900">
      Verse {currentIndex + 1} of {verseIds.length}
    </Text>
    <Text className="text-sm text-gray-600">
      {Math.round(((currentIndex + 1) / verseIds.length) * 100)}%
    </Text>
  </View>
  <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
    <View
      className="h-full bg-green-500 rounded-full"
      style={{ width: `${((currentIndex + 1) / verseIds.length) * 100}%` }}
    />
  </View>
</View>
```

### Navigation Buttons Layout

**Layout**: Three-button row at bottom of screen

```
┌──────────────────────────────────────┐
│  [← Previous]  [Exit]  [Next →]      │
└──────────────────────────────────────┘
```

**Button States**:
- **Previous**: Disabled (gray) on first verse, enabled (blue) otherwise
- **Exit**: Always enabled, gray-200 background
- **Next**: Enabled after reveal (green), or "Skip" (gray) if not revealed

**Code**:
```typescript
<View className="flex-row gap-3 px-6 pb-6">
  {/* Previous */}
  <TouchableOpacity
    onPress={handlePrevious}
    disabled={currentIndex === 0}
    className={`flex-1 py-3 rounded-lg items-center ${
      currentIndex === 0 ? 'bg-gray-300' : 'bg-blue-500'
    }`}
  >
    <Text className={`font-semibold ${
      currentIndex === 0 ? 'text-gray-500' : 'text-white'
    }`}>
      ← Previous
    </Text>
  </TouchableOpacity>

  {/* Exit */}
  <TouchableOpacity
    onPress={handleExitSession}
    className="bg-gray-200 px-4 py-3 rounded-lg"
  >
    <Text className="text-gray-700 font-medium">Exit</Text>
  </TouchableOpacity>

  {/* Next */}
  <TouchableOpacity
    onPress={handleNext}
    className={`flex-1 py-3 rounded-lg items-center ${
      revealed ? 'bg-green-500' : 'bg-gray-400'
    }`}
  >
    <Text className="text-white font-semibold">
      {revealed ? 'Next →' : 'Skip →'}
    </Text>
  </TouchableOpacity>
</View>
```

---

## Edge Cases & Error Handling

### Edge Case 1: Empty Session
**Scenario**: User starts session but no verses exist
**Solution**: Show error message, provide button to add verses

### Edge Case 2: Single Verse Session
**Scenario**: "Practice All" clicked with only 1 active verse
**Solution**: Navigate to individual practice screen (simpler flow)

### Edge Case 3: User Deletes Verse During Session
**Scenario**: User has app open in multiple tabs, deletes a verse
**Solution**: Skip verse if not found, show warning in summary

### Edge Case 4: User Navigates Away Mid-Session
**Scenario**: User presses back button or switches tabs
**Solution**:
- Progress for completed verses is already saved
- Session state is in URL, can resume by using browser back
- No special handling needed (URL-based state handles this)

### Edge Case 5: Very Long Session (20+ verses)
**Scenario**: User tries to practice all verses in large collection
**Solution**:
- No technical limit, but could warn in Phase 5 Task 3 (filtering)
- Consider adding "Practice 10 random verses" in future

### Edge Case 6: Network/Database Errors
**Scenario**: Database write fails during session
**Solution**:
- Show error alert
- Allow user to retry or continue (progress might be lost for that verse)
- Session can continue with other verses

---

## Testing Strategy

### Manual Testing Checklist

**Happy Path:**
- [ ] Start session with 3 verses
- [ ] Complete all 3 verses with different comfort levels
- [ ] Verify summary shows correct data
- [ ] Verify database has updated practice counts

**Navigation:**
- [ ] Previous button works on verse 2
- [ ] Previous button is disabled on verse 1
- [ ] Next button advances to next verse
- [ ] Next after last verse goes to summary

**Progress Tracking:**
- [ ] Progress bar shows correct percentage
- [ ] "Verse X of Y" displays correctly
- [ ] Progress persists when using Previous

**Exit Scenarios:**
- [ ] Exit button shows confirmation
- [ ] Exit confirmation "Cancel" keeps session active
- [ ] Exit confirmation "Exit" returns to practice tab
- [ ] Progress is saved for completed verses

**Data Persistence:**
- [ ] Practice counts increment correctly
- [ ] Comfort levels save correctly
- [ ] Last_practiced timestamp updates
- [ ] Changes visible in verse detail screen

**Edge Cases:**
- [ ] Session with 1 verse goes to individual screen
- [ ] Session with 0 verses shows error
- [ ] Skipping verses (not revealing) still navigates
- [ ] Invalid session IDs show error

### Automated Testing (Future)

While manual testing is sufficient for MVP, here are areas for future automated tests:

```typescript
describe('Practice Session', () => {
  it('navigates through multi-verse session');
  it('saves progress for each verse');
  it('shows summary at end of session');
  it('handles exit mid-session gracefully');
  it('validates session parameters');
});
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Practice Selection Screen                   │
│  (User clicks "Practice All" with 5 verses)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Navigate with IDs
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Practice Session Screen (Verse 1)              │
│  1. Load verse from store using verseIds[0]                     │
│  2. Display verse reference                                     │
│  3. User reveals verse                                          │
│  4. User sets comfort level                                     │
│  5. User clicks "Next"                                          │
│     ├─ Call recordPractice(verseId) → Database                  │
│     ├─ Call setComfortLevel(verseId, level) → Database         │
│     └─ Navigate to session?ids=...&index=1                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Repeat for verses 2-4
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Practice Session Screen (Verse 5)              │
│  Same flow, but "Next" button navigates to summary              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Navigate to summary
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Practice Summary Screen                     │
│  1. Load all verses using verseIds                              │
│  2. Load progress for each verse from store                     │
│  3. Display summary cards                                       │
│  4. Calculate statistics (average comfort, etc.)                │
│  5. User clicks "Done" → Navigate to /(tabs)/practice           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Sequence

### Recommended Order

1. **Task 2 first** (Create session screen)
   - Most complex task
   - Need to test navigation logic
   - Creates foundation for other tasks

2. **Task 1 second** (Modify selection screen)
   - Simple change
   - Enables end-to-end testing of session flow

3. **Task 3 third** (Create summary screen)
   - Depends on session screen existing
   - Completes the full flow

4. **Task 4 last** (Optional individual screen updates)
   - Nice-to-have enhancements
   - Can be deferred if time is limited

### Estimated Time

| Task | Effort | Time Estimate |
|------|--------|---------------|
| Task 1: Modify selection | Small | 15 min |
| Task 2: Session screen | Medium | 2-3 hours |
| Task 3: Summary screen | Small-Medium | 1-2 hours |
| Task 4: Individual enhancements | Tiny (Optional) | 15 min |
| **Testing & Polish** | - | 1 hour |
| **Total** | - | **4-6 hours** |

---

## Success Metrics

After implementation, we should be able to:

✅ **User can practice multiple verses in sequence**
- Start session from "Practice All" or "Needs Work"
- Navigate through all verses with Next/Previous
- See progress indicator throughout session

✅ **Session state is managed correctly**
- URL-based state (shareable, resumable)
- Progress saves for each verse
- Can exit mid-session without losing data

✅ **Summary provides valuable feedback**
- Shows all verses practiced
- Displays comfort levels
- Provides "Practice Again" option

✅ **Code quality maintained**
- Consistent with existing patterns
- Proper error handling
- TypeScript types for all session data
- Accessible UI components

---

## Future Enhancements (Post-MVP)

### Phase 5 Task 2+ or Future Versions

1. **Session Customization**
   - Select specific verses for session (multi-select UI)
   - Randomize order option
   - Filter by comfort level, translation, etc.

2. **Advanced Progress Tracking**
   - Time spent on each verse
   - Session history (view past practice sessions)
   - Streaks (practice X days in a row)

3. **Spaced Repetition**
   - Smart scheduling based on comfort level and time since last practice
   - "Practice Due" indicator
   - Adaptive difficulty

4. **Session Persistence**
   - Resume paused sessions across app restarts
   - Save "favorite" session configurations

5. **Performance Optimization**
   - Preload next verse while practicing current one
   - Optimize for large collections (100+ verses)

---

## Open Questions

### For Review Before Implementation

1. **Session Persistence**: Do we want to save session state in database for resume-later functionality, or is URL-based state sufficient for MVP?
   - **Recommendation**: URL-based state is sufficient for MVP. Database persistence can be added in future if needed.

2. **Session Ordering**: Should verses be presented in the order they appear in the verse list, or allow randomization?
   - **Recommendation**: Use verse list order for MVP. Add randomization option in Phase 5 Task 3 (filtering).

3. **Skip vs. Next**: Should skipping a verse (not revealing) still record a practice session?
   - **Recommendation**: No. Only record practice if user reveals the verse. "Skip" button should just navigate without saving.

4. **Summary Screen Stats**: What statistics should we show? Time spent (requires timer), average comfort, total practiced?
   - **Recommendation**: Keep it simple for MVP: verse count, average comfort level. Add time tracking in future if desired.

5. **Exit Confirmation**: Should we always confirm exit, or only if user has practiced at least one verse?
   - **Recommendation**: Always confirm (better safe than sorry). User can click "Cancel" if accidental.

---

## Dependencies & Prerequisites

### Before Starting Implementation

- [x] Phase 4 Complete (Database layer working)
- [x] Phase 4 Addendum Complete (Persistence working)
- [x] Zustand store has `recordPractice()` and `setComfortLevel()` methods
- [x] Individual practice screen working (`/practice/[id]`)
- [x] Practice selection screen working (`/(tabs)/practice`)

### No New Dependencies Required

All necessary functionality exists in current codebase:
- ✅ Expo Router for navigation
- ✅ Zustand for state management
- ✅ SQLite services for data persistence
- ✅ React Native components (View, Text, TouchableOpacity, etc.)
- ✅ NativeWind for styling

---

## Rollout Plan

### Implementation Phases

**Phase A: Core Session Flow (Must-Have)**
- Task 2: Create session screen with navigation
- Task 1: Update selection screen
- Basic testing

**Phase B: Polish & Summary (Should-Have)**
- Task 3: Create summary screen
- Comprehensive testing
- Bug fixes

**Phase C: Enhancements (Nice-to-Have)**
- Task 4: Optional individual screen updates
- Visual polish
- Performance optimization

### Rollback Plan

If critical issues are discovered:
1. Revert Task 1 changes (selection screen) to navigate to individual practice
2. Leave session.tsx and summary.tsx in codebase (no harm)
3. Session functionality becomes inaccessible until fixed
4. Existing individual practice flow continues to work

---

## Conclusion

This implementation will complete the practice flow, transforming it from a single-verse experience into a robust multi-verse practice session system. The URL-based state management approach keeps the implementation simple while maintaining flexibility for future enhancements.

The estimated 4-6 hours of development time will deliver significant value to users, making the practice feature feel complete and professional.

---

## Approval & Next Steps

**Ready for Implementation**: Yes ✅

**Recommended Next Action**: Begin with Task 2 (session screen), as it's the foundation for the other tasks.

**Questions or Concerns**: None identified. All necessary services and infrastructure are in place.

---

**Document Status**: Ready for Review
**Implementation Status**: Not Started
**Target Completion**: Phase 5 Task 1
