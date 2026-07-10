# Issues and Useability Nits from Daily Usage of the MVp

## Issues

1. On 2026-07-01 it was noted that the local browser shows 7 active verses, but a mobile browser on iOS shows 8 active verses. Inspection of the table in Supabase indeed shows 8 verses for the associated user. The verse missing from the local browser view is verse ID 5c23c5fb-1345-4735-b779-5dca7cf9f6d4, Lamentations 3:25-26. The verse is not deleted or archived. It is unclear why the verse does not show in the local browser.

2. The sign-out button on the settings page does not do anything on local Windows browser or iOS browser. (not tested on other devices).

3. The Test functionality has been noted to count the number of incorrect words and total words differently than expected. Will try to generate a repeatable example. So far repeated testing has showed the total number of words correct, but if a word is missing then it completely throws off the number of incorrect words (all are incorrect after the missing word).

## Useability Nits

### General

1. Need some way to more easily down-select an "active" set of verses for practice and test.  Simplest method would be a "shelf" system where we can name a group that a verse is assigned to, and choose a specifc group as active.  Currenly we have the "archived" group / shelf, which should remain as-is, and all verses should be read-only in archive.  Some other options would be tags, filters (e.g. keywords, book, etc), or comfort level.

### Practice Tab

1. "+ N More" is not an action-generating button. Note: all of this applies to the Test page as well. The practice verses page has a "Or choose a specific verse" section which lets you practice a specific verse. When there are 7 verses available, it shows the first 5 and "+ 2 more verses". The first 5 are clickable and take you to the practice page for the clicked verse, but the "+ 2 more" does not perform any action when clicked. It should expand to show the remaining verses, or perhaps some type of multi-page system if there are more than 100 verses. By default we should show more verses on a mobile device, perhaps 15 or 20, as long as it doesn't turn into never-ending scrolling.

