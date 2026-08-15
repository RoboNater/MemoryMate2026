/**
 * Pulls in Jest's ambient globals (describe/it/expect/...) for `tsc --noEmit`.
 * The root tsconfig doesn't set a `types` array (so it doesn't opt out of
 * automatic @types acquisition for anything else), but this project's
 * TypeScript/moduleDetection settings don't automatically surface
 * @types/jest as a global on their own -- this explicit reference does.
 */
/// <reference types="jest" />
