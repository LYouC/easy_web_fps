import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { PlayerMeleeEvent, WeaponChangedEvent, WeaponKind } from '@/core/GameEvents';
import type { InputManager } from '@/core/InputManager';
import { Rifle } from '@/weapons/Rifle';

export class WeaponLoadout {
  private readonly eventBus = EventBus.getInstance();
  private readonly rifle: Rifle;
  private equipped: WeaponKind = 'rifle';
  private switchKeyDown = false;
  private meleeCooldown = 0;
  private meleeStrikeRemaining = 0;
  private switchRemaining = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly inputManager: InputManager
  ) {
    this.rifle = new Rifle(camera, inputManager);
    this.emitWeaponChanged();
  }

  update(delta: number): void {
    this.meleeCooldown = Math.max(0, this.meleeCooldown - delta);
    if (this.meleeStrikeRemaining > 0) {
      this.meleeStrikeRemaining = Math.max(0, this.meleeStrikeRemaining - delta);
      if (this.meleeStrikeRemaining === 0 && this.equipped === 'knife') this.resolveKnifeStrike();
    }
    this.switchRemaining = Math.max(0, this.switchRemaining - delta);
    const riflePressed = this.inputManager.isKeyDown('Digit1');
    const knifePressed = this.inputManager.isKeyDown('Digit2');
    const togglePressed = this.inputManager.isKeyDown('KeyQ');
    const switchPressed = riflePressed || knifePressed || togglePressed;
    if (switchPressed && !this.switchKeyDown) {
      if (riflePressed) this.equip('rifle');
      else if (knifePressed) this.equip('knife');
      else this.equip(this.equipped === 'rifle' ? 'knife' : 'rifle');
    }
    this.switchKeyDown = switchPressed;

    this.rifle.update(delta, this.equipped === 'rifle' && this.switchRemaining === 0);
    if (this.equipped !== 'knife' || this.switchRemaining > 0 || !this.inputManager.isPointerLocked()) return;
    if (this.inputManager.isMouseButtonDown(0) && this.meleeCooldown === 0) this.startKnifeSwing();
  }

  private equip(weapon: WeaponKind): void {
    if (weapon === this.equipped) return;
    this.equipped = weapon;
    this.meleeStrikeRemaining = 0;
    this.switchRemaining = GameConfig.WEAPON.WEAPON_SWITCH_DURATION;
    this.emitWeaponChanged();
  }

  private startKnifeSwing(): void {
    this.meleeCooldown = GameConfig.WEAPON.KNIFE_ATTACK_INTERVAL;
    this.meleeStrikeRemaining = GameConfig.WEAPON.KNIFE_SWING_DURATION * GameConfig.WEAPON.KNIFE_HIT_FRAME;
    this.eventBus.emit('weapon:meleeSwing');
  }

  private resolveKnifeStrike(): void {
    const event: PlayerMeleeEvent = {
      origin: this.camera.getWorldPosition(new THREE.Vector3()),
      direction: this.camera.getWorldDirection(new THREE.Vector3()),
      damage: GameConfig.WEAPON.KNIFE_DAMAGE,
      range: GameConfig.WEAPON.KNIFE_RANGE,
    };
    this.eventBus.emit('player:melee', event);
  }

  private emitWeaponChanged(): void {
    const event: WeaponChangedEvent = { weapon: this.equipped };
    this.eventBus.emit('weapon:changed', event);
  }

  dispose(): void {
    this.rifle.dispose();
  }
}
