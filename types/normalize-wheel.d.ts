declare module 'normalize-wheel' {
  interface NormalizedWheel {
    pixelX: number;
    pixelY: number;
    spinX: number;
    spinY: number;
  }

  function normalizeWheel(event: WheelEvent): NormalizedWheel;
  export default normalizeWheel;
}

