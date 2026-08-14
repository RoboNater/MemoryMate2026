import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID that works across all platforms (Android, iOS, Web)
 *
 * Uses the 'uuid' package instead of expo-crypto's randomUUID(),
 * which is not supported on Android.
 */
export function generateUUID(): string {
  return uuidv4();
}
