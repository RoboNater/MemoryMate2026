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
import {
  scrollDeltaToReveal,
  webVisualViewportBounds,
  type VerticalViewport,
} from '../utils/activeSlotVisibility';

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
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const trailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleWindow = useCallback((): VerticalViewport => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const viewport = window.visualViewport;
      if (viewport) {
        return webVisualViewportBounds(viewport, window.scrollY);
      }
      return { top: 0, bottom: window.innerHeight };
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

      const previousOffset = scrollOffsetRef.current;
      const nextOffset = Math.max(0, scrollOffsetRef.current + delta);
      // Keep rapid letters based on the requested position, even before the
      // platform emits the corresponding onScroll event. Immediate scrolling
      // also prevents fast typing from queuing overlapping animations.
      scrollOffsetRef.current = nextOffset;
      activeSlotRef.current = {
        ...slot,
        y: slot.y - (nextOffset - previousOffset),
      };
      scrollView.scrollTo({ y: nextOffset, animated: false });
    });
  }, [visibleWindow]);

  // WebKit can dispatch visualViewport events before its keyboard geometry is
  // final. Re-reading after two paints is the shortest reliable trailing check
  // and does not delay the immediate correction above.
  const scheduleTrailingReveal = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (firstFrameRef.current !== null) cancelAnimationFrame(firstFrameRef.current);
    if (secondFrameRef.current !== null) cancelAnimationFrame(secondFrameRef.current);
    if (trailingTimerRef.current !== null) clearTimeout(trailingTimerRef.current);

    firstFrameRef.current = requestAnimationFrame(() => {
      firstFrameRef.current = null;
      secondFrameRef.current = requestAnimationFrame(() => {
        secondFrameRef.current = null;
        revealActiveSlot();
      });
    });
    trailingTimerRef.current = setTimeout(() => {
      trailingTimerRef.current = null;
      revealActiveSlot();
    }, 150);
  }, [revealActiveSlot]);

  const onActiveSlotLayout = useCallback(
    (layout: LayoutRectangle) => {
      activeSlotRef.current = layout;
      revealActiveSlot();
    },
    [revealActiveSlot]
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextOffset = event.nativeEvent.contentOffset.y;
    const delta = nextOffset - scrollOffsetRef.current;
    scrollOffsetRef.current = nextOffset;
    if (delta !== 0 && activeSlotRef.current) {
      activeSlotRef.current = {
        ...activeSlotRef.current,
        y: activeSlotRef.current.y - delta,
      };
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const viewport = window.visualViewport;
      viewport?.addEventListener('resize', scheduleTrailingReveal);
      viewport?.addEventListener('scroll', scheduleTrailingReveal);
      window.addEventListener('resize', scheduleTrailingReveal);

      return () => {
        viewport?.removeEventListener('resize', scheduleTrailingReveal);
        viewport?.removeEventListener('scroll', scheduleTrailingReveal);
        window.removeEventListener('resize', scheduleTrailingReveal);
        if (firstFrameRef.current !== null) cancelAnimationFrame(firstFrameRef.current);
        if (secondFrameRef.current !== null) cancelAnimationFrame(secondFrameRef.current);
        if (trailingTimerRef.current !== null) clearTimeout(trailingTimerRef.current);
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
  }, [revealActiveSlot, scheduleTrailingReveal]);

  return { scrollViewRef, onScroll, onActiveSlotLayout };
}
