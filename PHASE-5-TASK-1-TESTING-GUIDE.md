# Phase 5 Task 1 - Practice Flow Testing Guide

**Quick Reference for Manual Testing**

## Setup
```bash
cd memory-mate-mvp
npm run web  # Start web dev server
```

Browser opens at http://localhost:19000/

## Test Flow 1: Multi-Verse Session (Happy Path)

1. **Add 3+ verses** (if not already present)
   - Go to Verses tab → Add Verse
   - Add at least 3 different verses

2. **Start session**
   - Go to Practice tab
   - Click **"Practice All"** button
   - ✓ Should show "Verse 1 of N" with progress bar

3. **Practice verses**
   - Click **"Reveal Verse"** button
   - See verse text appear
   - Set **Comfort Level** (drag or click)
   - Click **"Next →"** button
   - ✓ Should advance to next verse
   - ✓ Progress bar should update

4. **Complete session**
   - Repeat for all verses
   - On last verse, click **"Next →"**
   - ✓ Should navigate to Summary screen

5. **Review summary**
   - ✓ Should show "✓ Practice Complete!"
   - ✓ Should show "Session Stats" with total verses and average comfort
   - ✓ Should show verse cards with comfort levels
   - Click **"Done"**
   - ✓ Should return to Practice tab

---

## Test Flow 2: Single Verse Session

1. **With only 1 active verse**
   - Go to Practice tab
   - Click **"Practice All"**
   - ✓ Should navigate directly to individual practice screen (`/practice/[id]`)
   - ✓ NOT to session screen

---

## Test Flow 3: Navigation

1. **Go back to previous verse**
   - Start session with 3+ verses
   - Get to verse 2
   - Click **"← Previous"** button
   - ✓ Should show verse 1 again
   - ✓ Progress bar should be at 33%

2. **Previous button on first verse**
   - Go to verse 1
   - ✓ **"← Previous"** button should be DISABLED (gray)
   - ✓ Cannot click it

3. **Rapid navigation**
   - Click Next, Previous, Next several times
   - ✓ Should navigate smoothly without errors

---

## Test Flow 4: Exit Session

1. **Exit with confirmation**
   - Start session
   - Get to verse 2 or 3
   - Click **"Exit"** button
   - ✓ Confirmation dialog should appear
   - Click **"Cancel"**
   - ✓ Should stay in session at same verse

2. **Actually exit**
   - Click **"Exit"** button again
   - Click **"Exit"** in dialog
   - ✓ Should return to Practice tab
   - ✓ Progress from previous verse should be saved

---

## Test Flow 5: Skip Verses

1. **Skip without revealing**
   - Start session
   - DON'T click "Reveal Verse"
   - Click **"Skip →"** button (gray)
   - ✓ Should move to next verse
   - ✓ Practice should NOT be recorded for skipped verse

2. **Check summary**
   - Reveal and practice 2 verses
   - Skip 1 verse
   - Complete session
   - In summary, skipped verse should show original comfort level

---

## Test Flow 6: Database Persistence

1. **Practice and set level**
   - Practice verse 1, set comfort level to **4**
   - Go to verse 2, set comfort level to **5**
   - Complete session

2. **Verify persistence**
   - Go to Verses tab
   - Click on the verses you practiced
   - ✓ Comfort levels should be 4 and 5
   - ✓ "Times practiced" should be incremented

3. **Practice again**
   - Click "Practice Again" in summary
   - Go back to verse 1
   - ✓ Should show comfort level as 4
   - ✓ "Times practiced" should show 2x

---

## Test Flow 7: Needs Work Button

1. **Have verses with different comfort levels**
   - Verse A: comfort level 1
   - Verse B: comfort level 3
   - Verse C: comfort level 5

2. **Click "Needs Work"**
   - Go to Practice tab
   - Click **"Needs Work"** button
   - ✓ Should show only verses with comfort 1-3
   - ✓ Should navigate to session (if 2+ verses) or individual screen (if 1)

---

## Test Flow 8: Edge Cases

1. **Delete verse during session**
   - Start session with verses A, B, C
   - Go to verse B
   - In another tab/window, delete verse B
   - Click "Next" in session
   - ✓ Should skip deleted verse and go to C
   - ✓ Summary should show A and C (not B)

2. **Session with 20 verses**
   - If you have many verses, select all
   - ✓ Should navigate smoothly
   - ✓ Progress bar should work correctly
   - ✓ Navigation should not lag

3. **Browser back button (Web only)**
   - Start session
   - Go to verse 2
   - Click browser back button
   - ✓ Should go to verse 1
   - OR ✓ Should exit to Practice tab (depending on behavior)

---

## Visual Checklist

### Session Screen
- [ ] Progress bar fills from left to right (green)
- [ ] "Verse X of Y" text is visible and correct
- [ ] Percentage shown at top right
- [ ] Verse reference card is styled correctly
- [ ] Comfort level picker appears after reveal
- [ ] Buttons are properly styled and aligned

### Summary Screen
- [ ] Success header with checkmark and "Practice Complete!"
- [ ] Session stats card shows verse count and average comfort
- [ ] Comfort level visual indicator (stars/bars)
- [ ] Verse cards show all practiced verses
- [ ] Each verse card shows reference, translation, comfort level
- [ ] "Practice Again" and "Done" buttons at bottom

### Error Handling
- [ ] Invalid session shows error message with context
- [ ] Missing verses shows graceful error
- [ ] No verses shows appropriate message

---

## Performance Check

- [ ] Session transitions are smooth (no lag)
- [ ] App doesn't crash when navigating
- [ ] Progress saves immediately (no delay)
- [ ] Multiple sessions don't accumulate in memory

---

## Cross-Platform Testing (if available)

### Web (Chrome/Firefox/Safari)
- [ ] All flows work
- [ ] Navigation smooth
- [ ] Data persists

### Android (Expo Go)
- [ ] All flows work
- [ ] Touch interactions responsive
- [ ] Buttons have good hit targets

### iOS (Expo Go)
- [ ] All flows work
- [ ] Touch interactions responsive
- [ ] Layout correct on different screen sizes

---

## Known Limitations (Not bugs)

- ❌ Session state not saved across app restarts (by design for MVP)
- ❌ No session history/archives (planned for future)
- ❌ Verses always in list order (no randomization option in MVP)
- ❌ No time tracking (planned for future)

---

## Success Criteria

✅ All above flows work without errors
✅ Data persists to database correctly
✅ No crashes or console errors
✅ UI is responsive and looks good
✅ Navigation is intuitive

---

**When testing is complete**, update `ccc.00.active-context.md` with results.

For detailed implementation info, see `ccc.29.mvp-phase-5-task-1-implementation-complete.md`
