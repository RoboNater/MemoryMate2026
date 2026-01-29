# Lessons Learned

This document captures lessons learned during the Memory Mate MVP development to help avoid similar issues in future projects.

---

## Issue 3: Import Data Button Not Working on Web

**Symptom:** The "Import Data" button did nothing when clicked on web. No console errors, no file picker, complete silence.

**Root Cause:** `Alert.alert()` was called before the file picker, which broke the browser's user gesture chain. Browser security requires file input activation (`input.click()`) to occur directly within a user gesture context. The modal callback broke this chain.

### Lessons Learned

1. **Browser security model is strict about user gestures**
   - File input activation must occur directly within a user gesture context
   - Modal callbacks, setTimeout, async/await chains can all break this context
   - Native platforms don't have this restriction, so code that works on iOS/Android may silently fail on web

2. **Native patterns don't always translate to web**
   - Confirmation dialogs before file access work fine on native but fail silently on web
   - When porting native patterns to web, verify each step maintains the user gesture chain

3. **Inconsistent patterns are a code smell**
   - The Export button worked (no confirmation dialog before action)
   - The Import button didn't work (had confirmation dialog before action)
   - This inconsistency should have prompted earlier investigation

4. **"No errors, nothing" is a browser security symptom**
   - When file pickers or other privileged actions silently fail with no console output, suspect user gesture context issues
   - Browser security often fails silently rather than throwing errors

### Fix Applied
Removed the `Alert.alert()` confirmation and triggered the file picker immediately on button press. Warning text is displayed above the button instead to inform users that import will replace their data.

---

## Issue 4: Add Verse Fails on Android

**Symptom:** Pressing "Add Verse" on Android showed a black screen with error: `getCrypto(...).randomUUID is not a function`. The same code worked perfectly on Windows/Web.

**Root Cause:** `expo-crypto`'s `randomUUID()` function is not supported on Android, despite being an official Expo package.

### Lessons Learned

1. **Expo APIs have platform gaps**
   - Not all Expo package functions work uniformly across iOS/Android/Web
   - Always check platform compatibility in Expo documentation before using any API
   - The Expo docs often list platform support, but it's easy to miss

2. **Prefer battle-tested packages for core utilities**
   - The `uuid` npm package has millions of weekly downloads and proven cross-platform support
   - Platform-specific APIs (like expo-crypto) may have edge cases or gaps
   - For fundamental operations like UUID generation, prefer widely-adopted solutions

3. **Centralize utility functions**
   - Creating `src/utils/uuid.ts` wrapping the uuid package makes future platform issues easier to fix in one place
   - If another platform issue emerges, only one file needs updating
   - Also makes testing and mocking easier

4. **Test on Android early and often**
   - Android often has different behavior than iOS/Web
   - The error message mentioning `getCrypto()` was a clear indicator of platform-specific crypto API issues
   - Don't assume "it works on web" means it will work on mobile

### Fix Applied
Installed the `uuid` npm package and created a `generateUUID()` utility function in `src/utils/uuid.ts`. Replaced all `Crypto.randomUUID()` calls in verseService.ts and testService.ts with the new cross-platform utility.

---

## General Takeaways

### Cross-Platform Development

- **Cross-platform means testing on all platforms** - Web has stricter security; Android has different native APIs; iOS may have its own quirks
- **Test early on each target platform** - Don't wait until the end to discover platform-specific failures
- **Platform-specific silent failures are common** - Each platform has its own security model and API availability

### Debugging Silent Failures

- **Silent failures need investigation** - If a button does "nothing," dig into platform-specific behavior rather than assuming the code is broken
- **Check browser security constraints** - File access, clipboard, geolocation, and other privileged APIs have strict user gesture requirements
- **Check Expo/React Native platform support** - Not all APIs are available everywhere

### Code Quality

- **Use widely-adopted packages** for core functionality rather than platform-specific APIs when possible
- **Centralize cross-cutting concerns** in utility functions for easier maintenance
- **Watch for pattern inconsistencies** - If similar features behave differently, investigate why

---

## References

- [MDN: File input security](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) - Browser file input security model
- [uuid npm package](https://www.npmjs.com/package/uuid) - Cross-platform UUID generation
- [Expo Crypto documentation](https://docs.expo.dev/versions/latest/sdk/crypto/) - Platform support notes
