import { scrollDeltaToReveal, webVisualViewportBounds } from '../activeSlotVisibility';

describe('webVisualViewportBounds', () => {
  it('converts page coordinates to the layout viewport used by element measurements', () => {
    expect(
      webVisualViewportBounds({ offsetTop: 80, pageTop: 380, height: 420 }, 300)
    ).toEqual({ top: 80, bottom: 500 });
  });

  it('uses pageTop when Safari reports a stale keyboard offsetTop', () => {
    expect(
      webVisualViewportBounds({ offsetTop: 24, pageTop: 180, height: 420 }, 100)
    ).toEqual({ top: 80, bottom: 500 });
  });
});

describe('scrollDeltaToReveal', () => {
  const viewport = { top: 100, bottom: 500 };

  it('leaves a fully visible active slot alone', () => {
    expect(scrollDeltaToReveal({ y: 220, height: 36 }, viewport, 12)).toBe(0);
  });

  it('scrolls only enough to reveal a slot hidden by the keyboard', () => {
    expect(scrollDeltaToReveal({ y: 475, height: 36 }, viewport, 12)).toBe(23);
  });

  it('uses the visual viewport offset when finding the visible top', () => {
    expect(scrollDeltaToReveal({ y: 105, height: 36 }, viewport, 12)).toBe(-7);
  });

  it('aligns an oversized target to the leading visible edge', () => {
    expect(scrollDeltaToReveal({ y: 150, height: 400 }, viewport, 12)).toBe(38);
  });

  it('does nothing for an invalid viewport', () => {
    expect(
      scrollDeltaToReveal({ y: 475, height: 36 }, { top: 500, bottom: 500 }, 12)
    ).toBe(0);
  });
});
