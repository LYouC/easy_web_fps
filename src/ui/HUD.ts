import { EventBus } from '@/core/EventBus';
import type { AmmoChangedEvent } from '@/core/GameEvents';

export class HUD {
  private readonly root: HTMLElement;
  private readonly magazineElement: HTMLElement;
  private readonly reserveElement: HTMLElement;
  private readonly statusElement: HTMLElement;
  private readonly crosshair: HTMLElement;
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
      @media (max-width: 640px) { .ammo-panel { right: 18px; bottom: 26px; transform: scale(.88); transform-origin: bottom right; } .controls-hint { display: none; } }
    `;
    document.head.appendChild(this.style);
    document.body.appendChild(this.root);

    this.magazineElement = this.requireElement('.ammo-magazine');
    this.reserveElement = this.requireElement('.ammo-reserve');
    this.statusElement = this.requireElement('.ammo-status');
    this.crosshair = this.requireElement('.hud-crosshair');

    document.getElementById('crosshair')?.remove();
    this.eventBus.on('weapon:ammoChanged', this.onAmmoChanged);
    this.eventBus.on('player:shoot', this.onShoot);
    this.eventBus.on('combat:shotHit', this.onHit);
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

  private pulseClass(className: string): void {
    this.crosshair.classList.remove(className);
    requestAnimationFrame(() => {
      this.crosshair.classList.add(className);
      window.setTimeout(() => this.crosshair.classList.remove(className), 90);
    });
  }

  dispose(): void {
    this.eventBus.off('weapon:ammoChanged', this.onAmmoChanged);
    this.eventBus.off('player:shoot', this.onShoot);
    this.eventBus.off('combat:shotHit', this.onHit);
    this.root.remove();
    this.style.remove();
  }
}
