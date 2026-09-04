import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';

export class AudioManager {
  private readonly eventBus: EventBus;
  private context: AudioContext | null = null;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('player:shoot', this.onShoot);
    this.eventBus.on('weapon:dryFire', this.onDryFire);
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

  dispose(): void {
    this.eventBus.off('player:shoot', this.onShoot);
    this.eventBus.off('weapon:dryFire', this.onDryFire);
    if (this.context) void this.context.close();
    this.context = null;
  }
}
