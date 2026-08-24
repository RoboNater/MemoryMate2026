import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
} from 'react-native';
import { scrollDeltaToReveal, type VerticalViewport } from '../utils/activeSlotVisibility';

const SLOT_EDGE_PADDING = 12;

/**
 * Keeps the moving guided-practice input visible without re-centering it.
 * The screen owns the ScrollView; FirstLetterPractice only reports its active
 * slot in window coordinates.
 */
export function useActiveSlotAutoScroll() {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const activeSlotRef = useRef<LayoutRectangle | null>(null);

  const visibleWindow = useCallback((): VerticalViewport => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      return {
        top,
        bottom: top + (viewport?.height ?? window.innerHeight),
      };
    }

    const windowHeight = Dimensions.get('window').height;
    return {
      top: 0,
      bottom:
        keyboardTopRef.current === null
          ? windowHeight
          : Math.min(windowHeight, keyboardTopRef.current),
    };
  }, []);

  const revealActiveSlot = useCallback(() => {
    const slot = activeSlotRef.current;
    const scrollView = scrollViewRef.current;
    if (!slot || !scrollView) return;
    const nativeScrollView = scrollView.getNativeScrollRef();
    if (!nativeScrollView) return;

    // The navigation header and the ScrollView's own frame can clip content as
    // well as the keyboard, so use their intersection as the real viewport.
    nativeScrollView.measureInWindow((_x, y, _width, height) => {
      const windowViewport = visibleWindow();
      const viewport = {
        top: Math.max(windowViewport.top, y),
        bottom: Math.min(windowViewport.bottom, y + height),
      };
      const delta = scrollDeltaToReveal(slot, viewport, SLOT_EDGE_PADDING);
      if (delta === 0) return;

      const nextOffset = Math.max(0, scrollOffsetRef.current + delta);
      // Keep rapid letters based on the requested position, even before the
      // platform emits the corresponding onScroll event. Immediate scrolling
      // also prevents fast typing from queuing overlapping animations.
      scrollOffsetRef.current = nextOffset;
      scrollView.scrollTo({ y: nextOffset, animated: false });
    });
  }, [visibleWindow]);

  const onActiveSlotLayout = useCallback(
    (layout: LayoutRectangle) => {
      activeSlotRef.current = layout;
      revealActiveSlot();
    },
    [revealActiveSlot]
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const viewport = window.visualViewport;
      viewport?.addEventListener('resize', revealActiveSlot);
      viewport?.addEventListener('scroll', revealActiveSlot);
      window.addEventListener('resize', revealActiveSlot);

      return () => {
        viewport?.removeEventListener('resize', revealActiveSlot);
        viewport?.removeEventListener('scroll', revealActiveSlot);
        window.removeEventListener('resize', revealActiveSlot);
      };
    }

    const handleKeyboardFrame = (event: KeyboardEvent) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      revealActiveSlot();
    };
    const handleKeyboardHide = () => {
      keyboardTopRef.current = null;
    };
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardFrame);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
    const dimensionsSubscription = Dimensions.addEventListener('change', revealActiveSlot);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      dimensionsSubscription.remove();
    };
  }, [revealActiveSlot]);

  return { scrollViewRef, onScroll, onActiveSlotLayout };
}
