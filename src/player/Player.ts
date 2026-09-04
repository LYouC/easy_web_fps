import { EventBus } from '@/core/EventBus';
import { GameConfig } from '@/config/GameConfig';
import type { PlayerHealthEvent } from '@/core/GameEvents';

export class Player {
  private hp: number;
  private maxHp: number;
  private alive: boolean;
  private eventBus: EventBus;

  constructor() {
    this.maxHp = GameConfig.PLAYER.MAX_HP;
    this.hp = this.maxHp;
    this.alive = true;
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('player:damageRequested', this.onDamageRequested);
  }

  private onDamageRequested = (...args: unknown[]): void => {
    const amount = args[0];
    if (typeof amount === 'number') this.takeDamage(amount);
  };

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    const event: PlayerHealthEvent = { hp: this.hp, maxHp: this.maxHp, damage: amount };
    this.eventBus.emit('player:hit', event);
    this.eventBus.emit('player:healthChanged', event);
    if (this.hp <= 0) {
      this.alive = false;
      this.eventBus.emit('player:died');
    }
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.eventBus.emit('player:healed', amount, this.hp);
    const event: PlayerHealthEvent = { hp: this.hp, maxHp: this.maxHp, damage: 0 };
    this.eventBus.emit('player:healthChanged', event);
  }

  reset(): void {
    this.hp = this.maxHp;
    this.alive = true;
    const event: PlayerHealthEvent = { hp: this.hp, maxHp: this.maxHp, damage: 0 };
    this.eventBus.emit('player:healthChanged', event);
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  isAlive(): boolean {
    return this.alive;
  }

  dispose(): void {
    this.eventBus.off('player:damageRequested', this.onDamageRequested);
  }
}
