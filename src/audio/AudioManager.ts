import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';

export class AudioManager {
  private readonly eventBus: EventBus;
  private context: AudioContext | null = null;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('player:shoot', this.onShoot);
    this.eventBus.on('weapon:dryFire', this.onDryFire);
    this.eventBus.on('enemy:attacked', this.onEnemyAttack);
    this.eventBus.on('enemy:damaged', this.onEnemyHit);
    this.eventBus.on('enemy:died', this.onEnemyDeath);
    this.eventBus.on('enemy:spawned', this.onEnemySpawn);
    this.eventBus.on('pickup:spawned', this.onPickupSpawn);
    this.eventBus.on('pickup:collected', this.onPickupCollected);
  }

  private getContext(): AudioContext {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private onShoot = (): void => {
    const context = this.getContext();
    const now = context.currentTime;
    const duration = GameConfig.WEAPON.SHOT_DURATION;
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    const compressor = context.createDynamicsCompressor();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(GameConfig.WEAPON.SHOT_FREQUENCY_START, now);
    oscillator.frequency.exponentialRampToValueAtTime(GameConfig.WEAPON.SHOT_FREQUENCY_END, now + duration);
    oscillatorGain.gain.setValueAtTime(GameConfig.WEAPON.SHOT_VOLUME, now);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(GameConfig.WEAPON.SHOT_VOLUME * 1.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(oscillatorGain).connect(compressor).connect(context.destination);
    noise.connect(noiseGain).connect(compressor);
    oscillator.start(now);
    oscillator.stop(now + duration);
    noise.start(now);
  };

  private onDryFire = (): void => {
    const context = this.getContext();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(62, now);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.035);
  };

  private playTone(type: OscillatorType, start: number, end: number, duration: number, volume: number): void {
    const context = this.getContext();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private onEnemyAttack = (): void => {
    this.playTone('square', GameConfig.ENEMY.ATTACK_FREQUENCY_START, GameConfig.ENEMY.ATTACK_FREQUENCY_END, GameConfig.ENEMY.ATTACK_DURATION, GameConfig.ENEMY.ATTACK_VOLUME);
  };

  private onEnemyHit = (): void => {
    this.playTone('triangle', GameConfig.ENEMY.HIT_FREQUENCY, GameConfig.ENEMY.HIT_FREQUENCY, GameConfig.ENEMY.HIT_DURATION, GameConfig.ENEMY.HIT_VOLUME);
  };

  private onEnemyDeath = (): void => {
    this.playTone('sawtooth', GameConfig.ENEMY.DEATH_FREQUENCY_START, GameConfig.ENEMY.DEATH_FREQUENCY_END, GameConfig.ENEMY.DEATH_DURATION_AUDIO, GameConfig.ENEMY.DEATH_VOLUME);
  };

  private onEnemySpawn = (): void => {
    this.playTone('sine', GameConfig.ENEMY.SPAWN_FREQUENCY_START, GameConfig.ENEMY.SPAWN_FREQUENCY_END, GameConfig.ENEMY.SPAWN_DURATION_AUDIO, GameConfig.ENEMY.SPAWN_VOLUME);
  };

  private onPickupSpawn = (): void => {
    this.playTone('sine', GameConfig.PICKUP.SPAWN_FREQUENCY_START, GameConfig.PICKUP.SPAWN_FREQUENCY_END, GameConfig.PICKUP.SPAWN_DURATION_AUDIO, GameConfig.PICKUP.SPAWN_VOLUME);
  };

  private onPickupCollected = (): void => {
    this.playTone('triangle', GameConfig.PICKUP.COLLECT_FREQUENCY_START, GameConfig.PICKUP.COLLECT_FREQUENCY_END, GameConfig.PICKUP.COLLECT_DURATION_AUDIO, GameConfig.PICKUP.COLLECT_VOLUME);
  };

  dispose(): void {
    this.eventBus.off('player:shoot', this.onShoot);
    this.eventBus.off('weapon:dryFire', this.onDryFire);
    this.eventBus.off('enemy:attacked', this.onEnemyAttack);
    this.eventBus.off('enemy:damaged', this.onEnemyHit);
    this.eventBus.off('enemy:died', this.onEnemyDeath);
    this.eventBus.off('enemy:spawned', this.onEnemySpawn);
    this.eventBus.off('pickup:spawned', this.onPickupSpawn);
    this.eventBus.off('pickup:collected', this.onPickupCollected);
    if (this.context) void this.context.close();
    this.context = null;
  }
}
