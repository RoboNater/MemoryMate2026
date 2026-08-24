export interface VerticalRect {
  y: number;
  height: number;
}

export interface VerticalViewport {
  top: number;
  bottom: number;
}

export interface WebVisualViewportMetrics {
  offsetTop: number;
  pageTop: number;
  height: number;
}

export interface ActiveSlotMeasurement extends VerticalRect {
  x: number;
  width: number;
  slotIndex: number;
}

export interface ActiveSlotScrollState {
  offset: number;
  slot: ActiveSlotMeasurement | null;
  lastMeasurement: ActiveSlotMeasurement | null;
}

/**
 * Expresses the visual viewport in getBoundingClientRect/measureInWindow's
 * layout-viewport coordinate space.
 *
 * In conforming browsers pageTop - scrollY equals offsetTop. Safari has shipped
 * releases where offsetTop is briefly stale while the software keyboard pans
 * the visual viewport, so pageTop is the source of truth here.
 */
export function webVisualViewportBounds(
  viewport: WebVisualViewportMetrics,
  layoutScrollY: number
): VerticalViewport {
  const top = Math.max(0, viewport.pageTop - layoutScrollY);
  return { top, bottom: top + viewport.height };
}

export function recordActiveSlotMeasurement(
  state: ActiveSlotScrollState,
  measurement: ActiveSlotMeasurement | null
): ActiveSlotScrollState {
  if (!measurement) {
    return { ...state, slot: null, lastMeasurement: null };
  }

  const previous = state.lastMeasurement;
  if (previous) {
    // measureInWindow is asynchronous. Do not let an older cursor overwrite a
    // newer one, and do not re-apply an identical pre-scroll measurement while
    // the platform's throttled onScroll event is still in flight.
    if (measurement.slotIndex < previous.slotIndex) return state;
    if (
      measurement.slotIndex === previous.slotIndex &&
      measurement.x === previous.x &&
      measurement.y === previous.y &&
      measurement.width === previous.width &&
      measurement.height === previous.height
    ) {
      return state;
    }
  }

  return { ...state, slot: measurement, lastMeasurement: measurement };
}

export function recordScrollOffset(
  state: ActiveSlotScrollState,
  offset: number
): ActiveSlotScrollState {
  const delta = offset - state.offset;
  return {
    ...state,
    offset,
    slot: state.slot ? { ...state.slot, y: state.slot.y - delta } : null,
  };
}

export function nextScrollState(
  state: ActiveSlotScrollState,
  viewport: VerticalViewport,
  padding = 0
): { state: ActiveSlotScrollState; targetOffset: number | null } {
  if (!state.slot) return { state, targetOffset: null };

  const delta = scrollDeltaToReveal(state.slot, viewport, padding);
  const targetOffset = Math.max(0, state.offset + delta);
  if (targetOffset === state.offset) return { state, targetOffset: null };

  return {
    state: recordScrollOffset(state, targetOffset),
    targetOffset,
  };
}

/**
 * Returns the smallest vertical scroll needed to reveal a rectangle.
 *
 * A positive result advances the ScrollView, a negative result scrolls back
 * up, and zero leaves the user's scroll position alone.
 */
export function scrollDeltaToReveal(
  rect: VerticalRect,
  viewport: VerticalViewport,
  padding = 0
): number {
  const visibleTop = viewport.top + padding;
  const visibleBottom = viewport.bottom - padding;
  const rectBottom = rect.y + rect.height;

  if (visibleBottom <= visibleTop) return 0;

  // If the target cannot fit, keep its leading edge visible rather than
  // oscillating between two impossible constraints.
  if (rect.height > visibleBottom - visibleTop) {
    return rect.y - visibleTop;
  }

  if (rectBottom > visibleBottom) {
    return rectBottom - visibleBottom;
  }

  if (rect.y < visibleTop) {
    return rect.y - visibleTop;
  }

  return 0;
}
