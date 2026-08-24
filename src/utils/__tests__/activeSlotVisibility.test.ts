import {
  nextScrollState,
  recordActiveSlotMeasurement,
  recordScrollOffset,
  scrollDeltaToReveal,
  webVisualViewportBounds,
  type ActiveSlotMeasurement,
  type ActiveSlotScrollState,
} from '../activeSlotVisibility';

describe('webVisualViewportBounds', () => {
  it('converts page coordinates to the layout viewport used by element measurements', () => {
    expect(
      webVisualViewportBounds({ offsetTop: 80, pageTop: 380, height: 420 }, 300)
    ).toEqual({ top: 80, bottom: 500 });
  });

  it('uses pageTop when Safari reports a stale-low keyboard offsetTop', () => {
    expect(
      webVisualViewportBounds({ offsetTop: 24, pageTop: 180, height: 420 }, 100)
    ).toEqual({ top: 80, bottom: 500 });
  });

  it('uses pageTop when Safari reports a stale-high keyboard offsetTop', () => {
    expect(
      webVisualViewportBounds({ offsetTop: 160, pageTop: 180, height: 420 }, 100)
    ).toEqual({ top: 80, bottom: 500 });
  });
});

describe('active-slot scroll accounting', () => {
  const initialState: ActiveSlotScrollState = {
    offset: 0,
    slot: null,
    lastMeasurement: null,
  };
  const measurement: ActiveSlotMeasurement = {
    x: 20,
    y: 470,
    width: 34,
    height: 36,
    slotIndex: 4,
  };
  const viewport = { top: 100, bottom: 500 };

  it('does not apply an identical pre-scroll measurement twice', () => {
    const measured = recordActiveSlotMeasurement(initialState, measurement);
    const first = nextScrollState(measured, viewport, 12);
    expect(first.targetOffset).toBe(18);
    expect(first.state.slot?.y).toBe(452);

    const duplicate = recordActiveSlotMeasurement(first.state, measurement);
    expect(duplicate).toBe(first.state);
    expect(nextScrollState(duplicate, viewport, 12).targetOffset).toBeNull();
  });

  it('reconciles a requested scroll with the platform offset it observes', () => {
    const measured = recordActiveSlotMeasurement(initialState, measurement);
    const requested = nextScrollState(measured, viewport, 12).state;

    const observed = recordScrollOffset(requested, 10);
    expect(observed.offset).toBe(10);
    expect(observed.slot?.y).toBe(460);
    expect(nextScrollState(observed, viewport, 12).targetOffset).toBe(18);
  });

  it('tracks manual scrolling without replacing the last raw measurement', () => {
    const measured = recordActiveSlotMeasurement(initialState, measurement);
    const scrolled = recordScrollOffset(measured, 30);
    expect(scrolled.slot?.y).toBe(440);
    expect(scrolled.lastMeasurement).toBe(measurement);
  });

  it('retires the slot when its input blurs or finishes', () => {
    const measured = recordActiveSlotMeasurement(initialState, measurement);
    const retired = recordActiveSlotMeasurement(measured, null);
    expect(retired.slot).toBeNull();
    expect(nextScrollState(retired, viewport, 12).targetOffset).toBeNull();
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
