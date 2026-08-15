# MVP Implementation Plan - Memory Mate 2026

This document outlines the implementation plan for the Memory Mate MVP, structured with review checkpoints to validate the UI and use cases before full implementation.

---

## Implementation Philosophy

1. **UI-First Validation** - Build screens and navigation early to validate against use cases
2. **Iterative Feedback** - Multiple checkpoints for review before proceeding
3. **Stub Data Initially** - Use mock data to enable UI review without backend complexity
4. **Incremental Integration** - Connect real data layer after UI is validated

---

## Phase Overview

| Phase | Focus | Deliverable | Checkpoint |
|-------|-------|-------------|------------|
| **Phase 1** | Project Setup | Running Expo app | CP-1: Dev environment works |
| **Phase 2** | Navigation & Screens | All screens with placeholders | CP-2: UI/UX review vs use cases |
| **Phase 3** | UI Components | Functional UI with mock data | CP-3: Interactive prototype review |
| **Phase 4** | Data Layer | SQLite + Zustand integration | CP-4: Data persistence works |
| **Phase 5** | Feature Integration | Complete working app | CP-5: Full feature review |
| **Phase 6** | Polish & Testing | Release candidate | CP-6: Final review |

---

## Phase 1: Project Setup

**Goal**: Establish development environment and project foundation.

### Tasks

1. **Initialize Expo Project**
   - Create new Expo project with TypeScript template
   - Configure for iOS, Android, and Web targets
   - Verify Expo Go works on physical device

2. **Install Core Dependencies**
   ```
   - expo-router (navigation)
   - nativewind (styling)
   - zustand (state management)
   - expo-sqlite (storage)
   ```

3. **Configure Project Structure**
   ```
   src/
   ├── app/                 # Expo Router pages
   │   ├── (tabs)/          # Tab navigation
   │   └── _layout.tsx      # Root layout
   ├── components/          # Reusable UI components
   ├── store/               # Zustand stores
   ├── services/            # Data access layer
   ├── types/               # TypeScript definitions
   ├── utils/               # Helper functions
   └── constants/           # App constants, colors
   ```

4. **Setup Development Tooling**
   - ESLint + Prettier configuration
   - TypeScript strict mode
   - Path aliases (@/components, etc.)

### Deliverables
- [ ] Running Expo app with "Hello World"
- [ ] All dependencies installed
- [ ] Project structure created
- [ ] Can run on iOS simulator, Android emulator, and web

---

### Checkpoint 1 (CP-1): Dev Environment Verification

**Review Items**:
- [ ] App runs on all three platforms (iOS, Android, Web)
- [ ] Hot reload working
- [ ] No dependency conflicts
- [ ] Developer can make changes and see results

**Decision Point**: Proceed to Phase 2 or resolve setup issues.

---

## Phase 2: Navigation & Screen Shells

**Goal**: Build all screens as shells with placeholder content to validate information architecture.

### Tasks

1. **Implement Tab Navigation**
   - Home tab
   - Verses tab
   - Practice tab
   - Test tab
   - Settings tab (placeholder)

2. **Create Screen Shells** (placeholder content only)

   | Screen | Route | Primary Use Cases |
   |--------|-------|-------------------|
   | Home/Dashboard | `/(tabs)/index` | UC-4.1 |
   | Verse List | `/(tabs)/verses` | UC-1.2 |
   | Add Verse | `/verse/add` | UC-1.1 |
   | Verse Detail | `/verse/[id]` | UC-1.3, UC-1.4, UC-1.5, UC-4.2 |
   | Edit Verse | `/verse/[id]/edit` | UC-1.4 |
   | Practice Session | `/(tabs)/practice` | UC-2.1 |
   | Practice Verse | `/practice/[id]` | UC-2.2, UC-2.3 |
   | Test Session | `/(tabs)/test` | UC-3.1 |
   | Test Verse | `/test/[id]` | UC-3.2 |
   | Settings | `/(tabs)/settings` | Future |

3. **Implement Basic Navigation Flows**
   - Tab switching
   - Navigate to verse detail from list
   - Navigate to add verse
   - Back navigation
   - Modal for delete confirmation

4. **Add Placeholder Content**
   - Screen titles
   - "Coming soon" or lorem ipsum placeholders
   - Basic layout structure (headers, content areas, footers)

### Deliverables
- [ ] All screens navigable
- [ ] Tab bar working
- [ ] Stack navigation working
- [ ] Screen layouts roughed in

---

### Checkpoint 2 (CP-2): UI/UX Review vs Use Cases

**Review Items**:
- [ ] Walk through each use case with the screen shells
- [ ] Verify navigation flow matches user expectations
- [ ] Identify missing screens or navigation paths
- [ ] Review tab organization and naming
- [ ] Check screen layout structure makes sense

**Questions to Answer**:
1. Does the navigation feel natural?
2. Are the use cases achievable with this screen structure?
3. Should any screens be combined or split?
4. Is the tab organization intuitive?

**Decision Point**:
- Approve screen structure → Proceed to Phase 3
- Revise navigation/screens → Iterate on Phase 2

---

## Phase 3: UI Components with Mock Data

**Goal**: Build functional UI components with hardcoded mock data to create an interactive prototype.

### Tasks

1. **Create Mock Data**
   ```typescript
   // src/utils/mockData.ts
   - 5-10 sample verses with varied translations
   - Progress data for each verse
   - Test history samples
   - Overall statistics
   ```

2. **Build Core UI Components**

   | Component | Used In | Description |
   |-----------|---------|-------------|
   | `VerseCard` | Verse List | Card showing reference, preview, comfort indicator |
   | `VerseDetail` | Verse Detail | Full verse display with all metadata |
   | `VerseForm` | Add/Edit Verse | Form with reference, text, translation inputs |
   | `ComfortLevelPicker` | Multiple | 1-5 scale selector |
   | `StatsCard` | Dashboard | Large number with label |
   | `ProgressBar` | Multiple | Visual progress indicator |
   | `TestResultBadge` | Test History | Pass/fail indicator with score |
   | `ConfirmDialog` | Delete/Reset | Confirmation modal |

3. **Implement Screens with Mock Data**

   **Home/Dashboard**
   - Stats cards (total verses, accuracy, etc.)
   - Quick action buttons
   - Recent activity summary

   **Verse List**
   - Scrollable list of VerseCards
   - Empty state when no verses
   - Filter toggle for archived verses
   - FAB or button to add verse

   **Verse Detail**
   - Full verse display
   - Progress stats section
   - Action buttons (Practice, Test, Edit, Archive, Delete)
   - Test history list

   **Add/Edit Verse**
   - Form with validation feedback
   - Save and Cancel buttons
   - Translation picker

   **Practice Flow**
   - Verse selection (or start with all)
   - Reference display
   - Reveal button
   - Comfort level setter
   - Next/Done navigation

   **Test Flow**
   - Verse selection
   - Reference display
   - Text input area
   - Check/Give Up buttons
   - Result display with comparison
   - Pass/Fail selection

4. **Style with NativeWind**
   - Consistent color scheme
   - Typography scale
   - Spacing system
   - Light mode (dark mode deferred)

### Deliverables
- [ ] All UI components built
- [ ] All screens populated with mock data
- [ ] Screens are interactive (buttons work, forms accept input)
- [ ] Consistent styling throughout

---

### Checkpoint 3 (CP-3): Interactive Prototype Review

**Review Items**:
- [ ] Walk through ALL use cases with interactive prototype
- [ ] Test each user flow end-to-end
- [ ] Evaluate visual design and usability
- [ ] Identify UX issues or improvements
- [ ] Test on actual devices (not just simulator)

**Use Case Verification**:

| Use Case | Screens Involved | Verified? |
|----------|------------------|-----------|
| UC-1.1 Add Verse | Add Verse | [ ] |
| UC-1.2 View List | Verse List | [ ] |
| UC-1.3 View Details | Verse Detail | [ ] |
| UC-1.4 Edit Verse | Edit Verse | [ ] |
| UC-1.5 Archive | Verse Detail | [ ] |
| UC-1.6 Unarchive | Verse Detail | [ ] |
| UC-1.7 Delete | Verse Detail | [ ] |
| UC-2.1 Start Practice | Practice | [ ] |
| UC-2.2 Practice Verse | Practice Verse | [ ] |
| UC-2.3 Set Comfort | Practice Verse, Detail | [ ] |
| UC-3.1 Start Test | Test | [ ] |
| UC-3.2 Take Test | Test Verse | [ ] |
| UC-3.3 View Results | Verse Detail | [ ] |
| UC-4.1 Overall Stats | Dashboard | [ ] |
| UC-4.2 Verse Stats | Verse Detail | [ ] |
| UC-4.3 Reset Progress | Verse Detail | [ ] |

**Questions to Answer**:
1. Does the UI support all use cases effectively?
2. Are there any confusing interactions?
3. Is the visual design acceptable?
4. Any use cases that need UI changes?

**Decision Point**:
- UI approved → Proceed to Phase 4
- UI needs changes → Iterate on Phase 3
- Use cases need revision → Update ccc.07 and iterate

---

## Phase 4: Data Layer Integration

**Goal**: Replace mock data with real SQLite storage and Zustand state management.

### Tasks

1. **Define TypeScript Types**
   ```typescript
   // src/types/index.ts
   - Verse
   - VerseProgress
   - TestResult
   - OverallStats
   - VerseStats
   ```

2. **Implement SQLite Database**
   ```typescript
   // src/services/database.ts
   - Database initialization
   - Schema creation (verses, progress, test_results tables)
   - Migration support (for future schema changes)
   ```

3. **Implement Data Service**
   ```typescript
   // src/services/verseService.ts
   // Mirror Python prototype methods:
   - addVerse()
   - getVerse()
   - getAllVerses()
   - updateVerse()
   - archiveVerse()
   - unarchiveVerse()
   - removeVerse()
   - recordPractice()
   - setComfortLevel()
   - resetProgress()
   - recordTestResult()
   - getTestHistory()
   - getStats()
   - getVerseStats()
   ```

4. **Implement Zustand Store**
   ```typescript
   // src/store/verseStore.ts
   - State: verses, loading, error
   - Actions: fetch, add, update, delete, etc.
   - Selectors: filtered verses, stats, etc.
   ```

5. **Connect UI to Store**
   - Replace mock data imports with store hooks
   - Add loading states
   - Add error handling

6. **Test Data Persistence**
   - Add verse, close app, reopen → verse persists
   - Practice/test → progress persists
   - Archive/delete → changes persist

### Deliverables
- [ ] SQLite database working
- [ ] All service methods implemented
- [ ] Zustand store connected to UI
- [ ] Data persists across app restarts

---

### Checkpoint 4 (CP-4): Data Persistence Verification

**Review Items**:
- [ ] Add a verse → persists after app restart
- [ ] Practice a verse → progress updates and persists
- [ ] Test a verse → test result recorded and persists
- [ ] Archive/unarchive → state persists
- [ ] Delete verse → cascade deletes progress and test history
- [ ] Reset progress → clears progress and test history
- [ ] Statistics calculate correctly

**Testing Scenarios**:
1. Fresh install → empty state displays correctly
2. Add 3 verses → list shows all 3
3. Close and reopen app → verses still there
4. Practice verse → times_practiced increments
5. Test verse (pass) → times_tested and times_correct increment
6. Test verse (fail) → times_tested increments, times_correct unchanged
7. Check stats → numbers match expectations

**Decision Point**:
- Data layer working → Proceed to Phase 5
- Issues found → Fix and re-verify

---

## Phase 5: Feature Integration & Polish

**Goal**: Complete all features and ensure they work together seamlessly.

### Tasks

1. **Complete Practice Flow**
   - Multiple verse practice session
   - Progress through verses
   - Practice summary at end
   - Return to verse list or home

2. **Complete Test Flow**
   - Multiple verse test session
   - Input comparison logic (word-by-word or character-by-character)
   - Score calculation (optional)
   - Test summary at end
   - Results saved correctly

3. **Implement Filtering & Sorting**
   - Filter verse list by archived status
   - Sort options (by date, reference, comfort level)
   - Practice mode filters (by comfort level)

4. **Add Loading States**
   - Skeleton loaders for lists
   - Button loading states
   - Prevent double-submission

5. **Add Error Handling**
   - Display errors gracefully
   - Retry options where appropriate
   - Validation error messages

6. **Accessibility**
   - Screen reader labels
   - Touch target sizes
   - Color contrast

7. **Edge Cases**
   - Empty states for all lists
   - Long verse text handling
   - Special characters in text
   - Offline behavior (should work fully offline)

### Deliverables
- [ ] All features complete and working
- [ ] Edge cases handled
- [ ] Error states implemented
- [ ] Loading states implemented

---

### Checkpoint 5 (CP-5): Full Feature Review

**Review Items**:
- [ ] Complete walkthrough of all use cases with real data
- [ ] Test edge cases (empty states, long text, etc.)
- [ ] Test on multiple devices/screen sizes
- [ ] Performance acceptable (smooth scrolling, fast loads)
- [ ] No crashes or data loss

**Acceptance Testing**:
1. Add 10+ verses with real Bible text
2. Practice multiple verses
3. Test multiple verses with varied results
4. Review statistics accuracy
5. Archive, unarchive, delete verses
6. Reset progress on a verse
7. Verify all data persists correctly

**Decision Point**:
- All features working → Proceed to Phase 6
- Issues found → Fix and re-verify

---

## Phase 6: Polish & Release Preparation

**Goal**: Prepare the app for release.

### Tasks

1. **Performance Optimization**
   - Profile and fix any performance issues
   - Optimize list rendering (virtualization)
   - Reduce bundle size if needed

2. **Visual Polish**
   - Consistent spacing and alignment
   - Animation and transitions (subtle)
   - App icon and splash screen

3. **Testing**
   - Manual testing on multiple devices
   - Test on older OS versions
   - Test web version in multiple browsers

4. **Documentation**
   - Update README with build instructions
   - Document any configuration needed

5. **Build Configuration**
   - Configure EAS Build (if using)
   - Set up app signing
   - Configure app store metadata

### Deliverables
- [ ] Performance optimized
- [ ] Visual polish complete
- [ ] Tested on target devices
- [ ] Build configuration ready

---

### Checkpoint 6 (CP-6): Final Review & Release Decision

**Review Items**:
- [ ] Final walkthrough of entire app
- [ ] Performance acceptable on target devices
- [ ] No known critical bugs
- [ ] App icon and branding in place
- [ ] Ready for TestFlight / Play Store internal testing

**Release Criteria**:
- All use cases functional
- Data persists reliably
- No crashes
- Acceptable performance
- Usable UI/UX

**Decision Point**:
- Ready → Release to beta testers
- Not ready → Address issues and re-review

---

## Checkpoint Summary

| Checkpoint | Phase | Key Question |
|------------|-------|--------------|
| **CP-1** | 1 | Does the dev environment work? |
| **CP-2** | 2 | Does the navigation structure support our use cases? |
| **CP-3** | 3 | Does the interactive UI prototype feel right? |
| **CP-4** | 4 | Does data persist correctly? |
| **CP-5** | 5 | Do all features work together? |
| **CP-6** | 6 | Is the app ready for release? |

**Early Validation Focus**: Checkpoints 2 and 3 are specifically designed to validate UI against use cases before investing in data layer implementation.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| UI doesn't match use cases | Early CP-2 and CP-3 reviews |
| Expo/React Native issues | Verify in CP-1 before investing |
| SQLite complexity | Use expo-sqlite with simple schema |
| Scope creep | Strict use case boundaries in ccc.07 |
| Performance issues | Test early on actual devices |

---

## Dependencies Between Phases

```
Phase 1 ─────► Phase 2 ─────► Phase 3 ─────► Phase 4 ─────► Phase 5 ─────► Phase 6
   │              │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼              ▼
 CP-1           CP-2           CP-3           CP-4           CP-5           CP-6
(Setup)     (Navigation)   (UI Review)    (Data OK)    (Features)     (Release)
```

**Key Insight**: Phases 2 and 3 use mock data, allowing UI validation without the data layer. This enables faster iteration on the user experience.

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Setup | Small |
| Phase 2: Navigation | Small |
| Phase 3: UI Components | Medium |
| Phase 4: Data Layer | Medium |
| Phase 5: Integration | Medium |
| Phase 6: Polish | Small-Medium |

---

## Next Steps

1. Review and approve this implementation plan
2. Begin Phase 1: Project Setup
3. Schedule CP-1 review when setup complete

---

**Document Version**: 1.0
**Created**: 2026-01-17
**Author**: Claude Code
