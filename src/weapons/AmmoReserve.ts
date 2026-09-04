export class AmmoReserve {
  private amount: number;
  private readonly maximum: number;

  constructor(amount: number, maximum: number) {
    this.amount = amount;
    this.maximum = maximum;
  }

  add(requested: number): number {
    const granted = Math.max(0, Math.min(requested, this.maximum - this.amount));
    this.amount += granted;
    return granted;
  }

  take(requested: number): number {
    const taken = Math.max(0, Math.min(requested, this.amount));
    this.amount -= taken;
    return taken;
  }

  getAmount(): number {
    return this.amount;
  }

  isEmpty(): boolean {
    return this.amount === 0;
  }

  isFull(): boolean {
    return this.amount >= this.maximum;
  }
}
