import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
} from 'react-native';
import {
  nextScrollState,
  recordActiveSlotMeasurement,
  recordScrollOffset,
  webVisualViewportBounds,
  type ActiveSlotMeasurement,
  type ActiveSlotScrollState,
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
  const keyboardTopRef = useRef<number | null>(null);
  const scrollStateRef = useRef<ActiveSlotScrollState>({
    offset: 0,
    slot: null,
    lastMeasurement: null,
  });
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const trailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleWindow = useCallback((): VerticalViewport => {
    if (Platform.OS === 'web') {
      // Expo Router can statically render web without a window; inert bounds avoid guessed scrolling.
      if (typeof window === 'undefined') return { top: 0, bottom: 0 };
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
    const scrollView = scrollViewRef.current;
    if (!scrollStateRef.current.slot || !scrollView) return;
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
      const next = nextScrollState(scrollStateRef.current, viewport, SLOT_EDGE_PADDING);
      scrollStateRef.current = next.state;
      if (next.targetOffset !== null) {
        // Immediate scrolling prevents fast typing from queuing animations.
        scrollView.scrollTo({ y: next.targetOffset, animated: false });
      }
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
    (layout: ActiveSlotMeasurement | null) => {
      scrollStateRef.current = recordActiveSlotMeasurement(scrollStateRef.current, layout);
      revealActiveSlot();
    },
    [revealActiveSlot]
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollStateRef.current = recordScrollOffset(
      scrollStateRef.current,
      event.nativeEvent.contentOffset.y
    );
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
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
      scrollStateRef.current = recordActiveSlotMeasurement(scrollStateRef.current, null);
    };
    keyboardTopRef.current = Keyboard.metrics()?.screenY ?? null;
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
