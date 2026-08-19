import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';

interface LiveRegionProps {
  /** What to announce. Empty announces nothing. */
  message: string;
  /**
   * Bump to announce `message` again when it has not changed. A screen reader
   * only reads a live region when its text changes, so an unchanged message
   * would otherwise be silent the second time.
   */
  nonce?: number;
}

/**
 * Announce a state change to a screen reader, on every platform.
 *
 * `AccessibilityInfo.announceForAccessibility` is a literal no-op in
 * react-native-web (its body is empty), so the web path has to be an
 * `aria-live` region instead. Native takes the announcement API, which is more
 * reliable there than a live region and does not double up on Android.
 */
export function LiveRegion({ message, nonce = 0 }: LiveRegionProps) {
  useEffect(() => {
    if (Platform.OS === 'web' || !message) return;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message, nonce]);

  if (Platform.OS !== 'web' || !message) return null;

  return (
    <View
      // Off screen rather than hidden: a display:none node is not announced.
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
      pointerEvents="none"
      // `aria-live` rather than `accessibilityLiveRegion` -- react-native-web
      // maps the latter to the former but warns that it is deprecated.
      aria-live="polite"
      aria-atomic
    >
      {/* The zero-width space makes a repeated message a text change. */}
      <Text>{nonce % 2 === 0 ? message : `${message}\u200B`}</Text>
    </View>
  );
}
