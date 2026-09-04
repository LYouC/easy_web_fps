import { EventBus } from '@/core/EventBus';
import { GameConfig } from '@/config/GameConfig';

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
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.eventBus.emit('player:hit', amount, this.hp);
    if (this.hp <= 0) {
      this.alive = false;
      this.eventBus.emit('player:died');
    }
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.eventBus.emit('player:healed', amount, this.hp);
  }

  reset(): void {
    this.hp = this.maxHp;
    this.alive = true;
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
}
