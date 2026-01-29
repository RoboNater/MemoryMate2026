# Issues found during cp-3 and cp-4 testing

1. After taking a test and submitting the answer, the user interface places focus on the Fail button and places a check-mark next to the word Fail.  I would prefer that the focus is on a different button/element than pass/fail, and the check-mark if Fail is selected should be an X.  Continue to use a check-mark only if Pass is selected.
2. After completing a test, the UI returns to the home screen without performing any other tests, evn if the test was initiated on the main test screen with the "test all verses" button, of which there were 3 during testing.
3. ~~The "Import Data" button on the Settings screen does not do anything. I don't see anything in the browser dev console when I press it either... no errors, nothing.~~ **FIXED** - Removed Alert.alert() confirmation that was blocking the file picker in browser context. File picker now triggers immediately, with warning text displayed above the button instead.
4. ~~The "Add Verse" button on the Add Verse screen no longer works on Android, but still works correctly on Windows.  Pressing it results in a black screen with the error message "Failed to load  [new line] getCrypto(...).randomUUID is not a function".~~ **FIXED** - Replaced expo-crypto's randomUUID() (not supported on Android) with industry-standard 'uuid' package via new generateUUID() utility function.  
5. Seeing a message in the Windows browser dev console:  index.js:24  props.pointerEvents is deprecated. Use style.pointerEvents
6. The Import Data button on the Settings screen now leads to a file chooser and appears to import data, but the data in the app (e.g. the available verses) does not change, so import is not working.
7. The number of active verses shown on the home screen is wrong, and seems to show 1 less than the actual number of active verses.  The number of active verses on the Verses screen is correct.

