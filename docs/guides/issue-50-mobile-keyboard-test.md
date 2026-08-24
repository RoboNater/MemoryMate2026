# Issue #50 mobile keyboard check

Automated tests cover the viewport geometry, and the repository checks cover the web and
native TypeScript paths. A real software keyboard is still needed for this short final
interaction check.

1. Open Memory Mate in **iOS Safari** and **Android Chrome** (or the installed native app
   on each platform), and add/select a verse long enough to wrap to at least five lines.
2. Start **First Letters** practice and type through the verse without manually scrolling.
3. Confirm the blue active box stays fully above the keyboard as it moves onto each new
   line. The page should move only when the box reaches the keyboard, not after every
   letter.
4. Manually scroll a little while the keyboard remains open, then type another letter.
   Confirm the page preserves that position if the next box is already visible, and only
   makes the minimum correction if it is hidden.

Please report the platform/browser (or native app), whether all four checks passed, and
any visible jump or box overlap.
