export type SfxName = 'click' | 'pick' | 'combine' | 'success' | 'failure' | 'win' | 'undo' | 'error';

/** WebAudio 合成音效（无外部资源；尊重音量与静音，文档 §7.2）。 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  volume = 0.6;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  resume(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  play(name: SfxName): void {
    if (this.muted || this.volume <= 0) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);

    const tone = (freq: number, start: number, dur: number, type: OscillatorType, peak = 0.5) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(peak, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g);
      g.connect(master);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };

    switch (name) {
      case 'click':
        tone(420, 0, 0.06, 'square', 0.25);
        break;
      case 'pick':
        tone(620, 0, 0.05, 'triangle', 0.3);
        break;
      case 'combine':
        tone(300, 0, 0.08, 'sawtooth', 0.3);
        tone(450, 0.05, 0.08, 'sawtooth', 0.25);
        break;
      case 'success':
        tone(523, 0, 0.1, 'sine', 0.4);
        tone(659, 0.09, 0.1, 'sine', 0.4);
        tone(784, 0.18, 0.14, 'sine', 0.4);
        break;
      case 'failure':
        tone(200, 0, 0.18, 'square', 0.35);
        tone(150, 0.06, 0.2, 'square', 0.3);
        break;
      case 'win':
        tone(523, 0, 0.12, 'triangle', 0.45);
        tone(659, 0.12, 0.12, 'triangle', 0.45);
        tone(784, 0.24, 0.12, 'triangle', 0.45);
        tone(1047, 0.36, 0.22, 'triangle', 0.45);
        break;
      case 'undo':
        tone(380, 0, 0.07, 'sine', 0.25);
        break;
      case 'error':
        tone(160, 0, 0.16, 'sawtooth', 0.3);
        break;
    }
  }
}

export const audio = new AudioEngine();
