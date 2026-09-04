export class AmmoAmountRules {
  static roll(minimum: number, maximum: number, step: number, randomValue: number = Math.random()): number {
    const clampedRandom = Math.max(0, Math.min(randomValue, 1 - Number.EPSILON));
    const stepCount = Math.floor((maximum - minimum) / step);
    return minimum + Math.floor(clampedRandom * (stepCount + 1)) * step;
  }
}
