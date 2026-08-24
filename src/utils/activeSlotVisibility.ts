export interface VerticalRect {
  y: number;
  height: number;
}

export interface VerticalViewport {
  top: number;
  bottom: number;
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
