# Phase 2 Implementation Plan: Navigation & Screen Shells

## Approach
**All at once** - Build all 11 screens in one go, then do CP-2 review.

## Objective
Build all screens as shells with placeholder content to validate the information architecture before investing in UI components (Phase 3) or data layer (Phase 4).

---

## Current State
- Phase 1 complete: Expo app running with all dependencies
- Only `app/_layout.tsx` and `app/index.tsx` exist
- Empty `src/` subdirectories ready for content

---

## Phase 2 Deliverables

### 1. Tab Navigation Structure
Create the bottom tab bar with 5 tabs:

| Tab | Route | Icon suggestion |
|-----|-------|-----------------|
| Home | `/(tabs)/index` | home |
| Verses | `/(tabs)/verses` | book |
| Practice | `/(tabs)/practice` | brain/refresh |
| Test | `/(tabs)/test` | check-circle |
| Settings | `/(tabs)/settings` | gear |

**Files to create:**
- `app/(tabs)/_layout.tsx` - Tab navigation wrapper
- `app/(tabs)/index.tsx` - Home/Dashboard screen
- `app/(tabs)/verses.tsx` - Verse list screen
- `app/(tabs)/practice.tsx` - Practice session start
- `app/(tabs)/test.tsx` - Test session start
- `app/(tabs)/settings.tsx` - Settings placeholder

### 2. Stack Navigation Routes
Create screens that open from tabs:

| Screen | Route | Opens from |
|--------|-------|------------|
| Add Verse | `app/verse/add.tsx` | Verses tab |
| Verse Detail | `app/verse/[id]/index.tsx` | Verses tab |
| Edit Verse | `app/verse/[id]/edit.tsx` | Verse Detail |
| Practice Verse | `app/practice/[id].tsx` | Practice tab |
| Test Verse | `app/test/[id].tsx` | Test tab |

**Files to create:**
- `app/verse/add.tsx`
- `app/verse/[id]/index.tsx`
- `app/verse/[id]/edit.tsx`
- `app/practice/[id].tsx`
- `app/test/[id].tsx`

### 3. Update Root Layout
Modify `app/_layout.tsx` to handle both tabs and stack screens properly.

---

## Implementation Order

1. **Tab structure first** - Get the tab bar working with all 5 tabs
2. **Stack routes** - Add the detail/modal screens
3. **Navigation links** - Wire up buttons to navigate between screens
4. **Polish placeholders** - Add meaningful placeholder text for each screen

---

## Screen Placeholder Content

Each screen should include:
- Screen title
- Brief description of what will be here
- Use case reference (e.g., "Supports UC-1.2: View verse list")
- Navigation buttons (even if hardcoded to dummy IDs for now)

Example:
```tsx
// app/(tabs)/verses.tsx
export default function VersesScreen() {
  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-2">Verses</Text>
      <Text className="text-gray-500 mb-4">Supports UC-1.2: View verse list</Text>

      <Text className="text-gray-400 italic mb-8">
        Verse list will appear here...
      </Text>

      <Link href="/verse/add" asChild>
        <Pressable className="bg-blue-500 p-4 rounded-lg">
          <Text className="text-white text-center">+ Add Verse</Text>
        </Pressable>
      </Link>
    </View>
  );
}
```

---

## Verification (CP-2 Checkpoint)

After Phase 2, verify:
- [ ] All 5 tabs accessible from tab bar
- [ ] Can navigate: Verses → Verse Detail → Edit Verse → back
- [ ] Can navigate: Verses → Add Verse → back
- [ ] Can navigate: Practice → Practice Verse → back
- [ ] Can navigate: Test → Test Verse → back
- [ ] Back navigation works correctly
- [ ] Deep linking works (test with URLs)

---

## Files Summary

**New files (11 total):**
```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator
│   ├── index.tsx        # Home (can reuse existing)
│   ├── verses.tsx       # Verse list
│   ├── practice.tsx     # Practice start
│   ├── test.tsx         # Test start
│   └── settings.tsx     # Settings
├── verse/
│   ├── add.tsx          # Add verse form
│   └── [id]/
│       ├── index.tsx    # Verse detail
│       └── edit.tsx     # Edit verse form
├── practice/
│   └── [id].tsx         # Practice individual verse
└── test/
    └── [id].tsx         # Test individual verse
```

**Modified files (1):**
- `app/_layout.tsx` - Update to handle tab + stack structure

---

## Notes

- No mock data in Phase 2 - that's Phase 3
- No UI components - just basic Text/View/Pressable
- Focus is on validating the navigation structure and information architecture
- Keep placeholder content simple but informative
