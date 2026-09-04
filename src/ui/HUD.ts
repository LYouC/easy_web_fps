import { EventBus } from '@/core/EventBus';
import type { AmmoChangedEvent } from '@/core/GameEvents';
import type { PlayerHealthEvent, ScoreChangedEvent, WaveCompletedEvent, WaveStartedEvent } from '@/core/GameEvents';
import { GameConfig } from '@/config/GameConfig';

export class HUD {
  private readonly root: HTMLElement;
  private readonly magazineElement: HTMLElement;
  private readonly reserveElement: HTMLElement;
  private readonly statusElement: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpValue: HTMLElement;
  private readonly scoreElement: HTMLElement;
  private readonly waveElement: HTMLElement;
  private readonly announcement: HTMLElement;
  private readonly damageOverlay: HTMLElement;
  private readonly eventBus: EventBus;
  private readonly style: HTMLStyleElement;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.root = document.createElement('div');
    this.root.id = 'combat-hud';
    this.root.innerHTML = `
      <div class="hud-crosshair" aria-label="Crosshair">
        <i class="crosshair-line crosshair-top"></i>
        <i class="crosshair-line crosshair-right"></i>
        <i class="crosshair-line crosshair-bottom"></i>
        <i class="crosshair-line crosshair-left"></i>
        <i class="crosshair-dot"></i>
      </div>
      <div class="status-panel">
        <div class="status-label">VITALS</div>
        <div class="hp-row"><span class="hp-value">${GameConfig.PLAYER.MAX_HP}</span><span class="hp-unit">HP</span></div>
        <div class="hp-track"><i class="hp-fill"></i></div>
      </div>
      <div class="mission-panel">
        <div><span class="mission-label">SCORE</span><strong class="score-value">000000</strong></div>
        <div><span class="mission-label">WAVE</span><strong class="wave-value">00</strong></div>
      </div>
      <div class="wave-announcement"><span class="wave-kicker">INCOMING</span><strong>WAVE 01</strong><small>3 HOSTILES</small></div>
      <div class="damage-overlay"></div>
      <div class="ammo-panel">
        <div class="weapon-label"><span class="weapon-icon">R</span> SERVICE RIFLE</div>
        <div class="ammo-row">
          <span class="ammo-magazine">30</span>
          <span class="ammo-divider">/</span>
          <span class="ammo-reserve">90</span>
        </div>
        <div class="ammo-status">SEMI / AUTO</div>
      </div>
      <div class="controls-hint">LMB FIRE <b>·</b> R RELOAD</div>
    `;

    this.style = document.createElement('style');
    this.style.textContent = `
      #combat-hud { position: fixed; inset: 0; z-index: 20; pointer-events: none; color: #eef7f4; font-family: Inter, "Segoe UI", sans-serif; }
      .hud-crosshair { position: absolute; left: 50%; top: 50%; width: 38px; height: 38px; transform: translate(-50%, -50%); filter: drop-shadow(0 1px 2px #000); transition: transform 70ms ease, filter 70ms ease; }
      .crosshair-line { position: absolute; display: block; background: rgba(235, 255, 249, .94); border-radius: 2px; box-shadow: 0 0 4px rgba(132, 255, 214, .34); }
      .crosshair-top, .crosshair-bottom { width: 2px; height: 9px; left: 18px; }
      .crosshair-left, .crosshair-right { width: 9px; height: 2px; top: 18px; }
      .crosshair-top { top: 0; } .crosshair-bottom { bottom: 0; } .crosshair-left { left: 0; } .crosshair-right { right: 0; }
      .crosshair-dot { position: absolute; width: 3px; height: 3px; left: 17.5px; top: 17.5px; border-radius: 50%; background: #dffdf2; }
      .hud-crosshair.firing { transform: translate(-50%, -50%) scale(1.16); }
      .hud-crosshair.hit { filter: drop-shadow(0 0 5px #ffbf66); }
      .hud-crosshair.hit .crosshair-line, .hud-crosshair.hit .crosshair-dot { background: #ffbf66; }
      .ammo-panel { position: absolute; right: 38px; bottom: 34px; min-width: 228px; padding: 14px 17px 12px; overflow: hidden; border: 1px solid rgba(173, 218, 204, .38); border-right: 3px solid #83e1c0; background: linear-gradient(115deg, rgba(9, 18, 22, .82), rgba(18, 33, 36, .62)); box-shadow: 0 10px 32px rgba(0, 0, 0, .32), inset 0 0 28px rgba(99, 208, 170, .04); backdrop-filter: blur(7px); clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px); }
      .status-panel { position: absolute; left: 38px; bottom: 34px; width: 228px; padding: 14px 17px 15px; border: 1px solid rgba(173, 218, 204, .38); border-left: 3px solid #83e1c0; background: linear-gradient(245deg, rgba(9, 18, 22, .82), rgba(18, 33, 36, .62)); box-shadow: 0 10px 32px rgba(0, 0, 0, .32); backdrop-filter: blur(7px); clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%); }
      .status-label, .mission-label { color: #91acaa; font-size: 9px; font-weight: 700; letter-spacing: 2.1px; }
      .hp-row { display: flex; align-items: baseline; gap: 7px; height: 47px; }
      .hp-value { font-size: 40px; line-height: 1; font-weight: 300; font-variant-numeric: tabular-nums; }
      .hp-unit { color: #6f908b; font-size: 10px; letter-spacing: 1.7px; }
      .hp-track { height: 5px; overflow: hidden; background: rgba(121, 150, 144, .22); }
      .hp-fill { display: block; width: 100%; height: 100%; background: linear-gradient(90deg, #5bbf9f, #9df0cf); box-shadow: 0 0 9px rgba(131, 225, 192, .45); transform-origin: left; transition: transform .18s ease, background .18s ease; }
      .status-panel.low { border-left-color: #ff655f; }
      .status-panel.low .hp-value { color: #ff8a75; }
      .status-panel.low .hp-fill { background: #ff655f; }
      .mission-panel { position: absolute; left: 38px; top: 34px; display: flex; gap: 24px; padding: 10px 14px; border-top: 1px solid rgba(173, 218, 204, .35); background: linear-gradient(90deg, rgba(9, 18, 22, .74), rgba(9, 18, 22, .12)); }
      .mission-panel > div { display: grid; gap: 3px; }
      .mission-panel strong { min-width: 72px; color: #eaf8f3; font-size: 18px; font-weight: 450; letter-spacing: 2px; font-variant-numeric: tabular-nums; }
      .wave-announcement { position: absolute; left: 50%; top: 22%; display: grid; justify-items: center; min-width: 280px; padding: 12px 34px 14px; opacity: 0; transform: translate(-50%, -12px); border-top: 1px solid rgba(131, 225, 192, .66); border-bottom: 1px solid rgba(131, 225, 192, .25); background: linear-gradient(90deg, transparent, rgba(10, 25, 26, .82), transparent); transition: opacity .25s ease, transform .25s ease; }
      .wave-announcement.visible { opacity: 1; transform: translate(-50%, 0); }
      .wave-announcement .wave-kicker { color: #83e1c0; font-size: 9px; letter-spacing: 4px; }
      .wave-announcement strong { margin: 3px 0; font-size: 28px; font-weight: 300; letter-spacing: 6px; }
      .wave-announcement small { color: #91acaa; font-size: 9px; letter-spacing: 2px; }
      .damage-overlay { position: absolute; inset: 0; opacity: 0; background: radial-gradient(circle, transparent 42%, rgba(255, 45, 35, .42) 100%); transition: opacity .16s ease; }
      .damage-overlay.visible { opacity: 1; }
      .weapon-label { color: #91acaa; font-size: 10px; font-weight: 700; letter-spacing: 2.2px; }
      .weapon-icon { display: inline-grid; place-items: center; width: 17px; height: 17px; margin-right: 8px; color: #10201f; background: #83e1c0; font-size: 10px; letter-spacing: 0; }
      .ammo-row { display: flex; align-items: baseline; justify-content: flex-end; height: 53px; margin-top: 2px; font-variant-numeric: tabular-nums; }
      .ammo-magazine { font-size: 49px; line-height: 1; font-weight: 250; letter-spacing: -2px; text-shadow: 0 0 18px rgba(131, 225, 192, .16); }
      .ammo-divider { margin: 0 9px; color: #5d7774; font-size: 23px; font-weight: 300; }
      .ammo-reserve { min-width: 48px; color: #a8bbb8; font-size: 23px; font-weight: 500; }
      .ammo-status { border-top: 1px solid rgba(138, 190, 176, .2); padding-top: 7px; color: #6f908b; font-size: 9px; text-align: right; letter-spacing: 2px; }
      .ammo-panel.low .ammo-magazine { color: #ffb55f; }
      .ammo-panel.empty { border-right-color: #ff655f; }
      .ammo-panel.empty .ammo-magazine, .ammo-panel.empty .ammo-status { color: #ff655f; }
      .ammo-panel.reloading .ammo-status { color: #83e1c0; animation: hud-pulse .7s ease-in-out infinite alternate; }
      .controls-hint { position: absolute; right: 40px; bottom: 16px; color: rgba(177, 202, 197, .5); font-size: 9px; letter-spacing: 1.7px; }
      .controls-hint b { margin: 0 5px; color: #83e1c0; }
      @keyframes hud-pulse { to { opacity: .38; } }
      @media (max-width: 640px) { .ammo-panel { right: 18px; bottom: 26px; transform: scale(.78); transform-origin: bottom right; } .status-panel { left: 18px; bottom: 26px; transform: scale(.78); transform-origin: bottom left; } .mission-panel { left: 18px; top: 20px; transform: scale(.82); transform-origin: top left; } .controls-hint { display: none; } }
    `;
    document.head.appendChild(this.style);
    document.body.appendChild(this.root);

    this.magazineElement = this.requireElement('.ammo-magazine');
    this.reserveElement = this.requireElement('.ammo-reserve');
    this.statusElement = this.requireElement('.ammo-status');
    this.crosshair = this.requireElement('.hud-crosshair');
    this.hpFill = this.requireElement('.hp-fill');
    this.hpValue = this.requireElement('.hp-value');
    this.scoreElement = this.requireElement('.score-value');
    this.waveElement = this.requireElement('.wave-value');
    this.announcement = this.requireElement('.wave-announcement');
    this.damageOverlay = this.requireElement('.damage-overlay');

    document.getElementById('crosshair')?.remove();
    this.eventBus.on('weapon:ammoChanged', this.onAmmoChanged);
    this.eventBus.on('player:shoot', this.onShoot);
    this.eventBus.on('combat:shotHit', this.onHit);
    this.eventBus.on('player:healthChanged', this.onHealthChanged);
    this.eventBus.on('score:changed', this.onScoreChanged);
    this.eventBus.on('wave:started', this.onWaveStarted);
    this.eventBus.on('wave:completed', this.onWaveCompleted);
  }

  private requireElement(selector: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`HUD element missing: ${selector}`);
    return element;
  }

  private onAmmoChanged = (...args: unknown[]): void => {
    const ammo = args[0] as AmmoChangedEvent | undefined;
    if (!ammo) return;
    this.magazineElement.textContent = ammo.magazine.toString().padStart(2, '0');
    this.reserveElement.textContent = ammo.reserve.toString().padStart(2, '0');
    this.statusElement.textContent = ammo.reloading ? 'RELOADING…' : ammo.magazine === 0 ? 'MAGAZINE EMPTY' : 'SEMI / AUTO';
    const panel = this.root.querySelector('.ammo-panel');
    panel?.classList.toggle('low', ammo.magazine > 0 && ammo.magazine <= Math.ceil(ammo.magazineSize * 0.2));
    panel?.classList.toggle('empty', ammo.magazine === 0);
    panel?.classList.toggle('reloading', ammo.reloading);
  };

  private onShoot = (): void => {
    this.pulseClass('firing');
  };

  private onHit = (): void => {
    this.pulseClass('hit');
  };

  private onHealthChanged = (...args: unknown[]): void => {
    const health = args[0] as PlayerHealthEvent | undefined;
    if (!health) return;
    const ratio = health.hp / health.maxHp;
    this.hpValue.textContent = Math.ceil(health.hp).toString().padStart(GameConfig.HUD.HP_DIGITS, '0');
    this.hpFill.style.transform = `scaleX(${ratio})`;
    this.root.querySelector('.status-panel')?.classList.toggle('low', ratio <= GameConfig.HUD.LOW_HP_THRESHOLD);
    if (health.damage > 0) this.pulseDamage();
  };

  private onScoreChanged = (...args: unknown[]): void => {
    const score = args[0] as ScoreChangedEvent | undefined;
    if (score) this.scoreElement.textContent = score.score.toString().padStart(GameConfig.HUD.SCORE_DIGITS, '0');
  };

  private onWaveStarted = (...args: unknown[]): void => {
    const wave = args[0] as WaveStartedEvent | undefined;
    if (!wave) return;
    this.waveElement.textContent = wave.wave.toString().padStart(GameConfig.HUD.VALUE_DIGITS, '0');
    this.showAnnouncement('INCOMING', `WAVE ${wave.wave.toString().padStart(GameConfig.HUD.VALUE_DIGITS, '0')}`, `${wave.enemyCount} HOSTILES`);
  };

  private onWaveCompleted = (...args: unknown[]): void => {
    const wave = args[0] as WaveCompletedEvent | undefined;
    if (!wave) return;
    this.showAnnouncement('AREA CLEAR', `WAVE ${wave.wave.toString().padStart(GameConfig.HUD.VALUE_DIGITS, '0')} COMPLETE`, `NEXT WAVE IN ${wave.delay.toFixed(0)}s`);
  };

  private showAnnouncement(kicker: string, title: string, detail: string): void {
    const kickerElement = this.announcement.querySelector<HTMLElement>('.wave-kicker');
    const titleElement = this.announcement.querySelector<HTMLElement>('strong');
    const detailElement = this.announcement.querySelector<HTMLElement>('small');
    if (kickerElement) kickerElement.textContent = kicker;
    if (titleElement) titleElement.textContent = title;
    if (detailElement) detailElement.textContent = detail;
    this.announcement.classList.add('visible');
    window.setTimeout(() => this.announcement.classList.remove('visible'), GameConfig.HUD.WAVE_TRANSITION_DURATION_MS);
  }

  private pulseDamage(): void {
    this.damageOverlay.classList.remove('visible');
    requestAnimationFrame(() => {
      this.damageOverlay.classList.add('visible');
      window.setTimeout(() => this.damageOverlay.classList.remove('visible'), GameConfig.HUD.DAMAGE_FLASH_DURATION_MS);
    });
  }

  private pulseClass(className: string): void {
    this.crosshair.classList.remove(className);
    requestAnimationFrame(() => {
      this.crosshair.classList.add(className);
      window.setTimeout(() => this.crosshair.classList.remove(className), GameConfig.HUD.HIT_PULSE_DURATION_MS);
    });
  }

  dispose(): void {
    this.eventBus.off('weapon:ammoChanged', this.onAmmoChanged);
    this.eventBus.off('player:shoot', this.onShoot);
    this.eventBus.off('combat:shotHit', this.onHit);
    this.eventBus.off('player:healthChanged', this.onHealthChanged);
    this.eventBus.off('score:changed', this.onScoreChanged);
    this.eventBus.off('wave:started', this.onWaveStarted);
    this.eventBus.off('wave:completed', this.onWaveCompleted);
    this.root.remove();
    this.style.remove();
  }
}
