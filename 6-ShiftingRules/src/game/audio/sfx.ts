/**
 * 音效合成 (WebAudio，文档 §7.2)。
 * 不依赖任何音频资源文件：用振荡器现场合成 正确/错误/连击/规则切换/倒计时 音。
 * 高频音柔、可单独关闭（设置里 sfx 开关）。首次用户手势后才创建 AudioContext（绕过自动播放限制）。
 */
type Osc = "sine" | "square" | "sawtooth" | "triangle";

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  volume = 0.7;

  /** 在首次用户手势调用，创建/恢复音频上下文 */
  ensure(): void {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  private blip(freq: number, dur: number, type: Osc = "sine", gain = 0.3): void {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(this.master);
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(Math.max(0.0001, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  correct(): void {
    this.blip(660, 0.12, "triangle", 0.32);
    this.blip(880, 0.12, "triangle", 0.22);
  }
  wrong(): void {
    this.blip(150, 0.26, "sawtooth", 0.28);
  }
  combo(n: number): void {
    this.blip(700 + Math.min(n, 10) * 45, 0.1, "square", 0.22);
  }
  ruleChange(): void {
    this.blip(520, 0.15, "sine", 0.3);
    this.blip(780, 0.2, "sine", 0.24);
  }
  countdown(): void {
    this.blip(440, 0.08, "square", 0.22);
  }
  go(): void {
    this.blip(880, 0.16, "square", 0.3);
  }
  click(): void {
    this.blip(330, 0.05, "square", 0.18);
  }
}

export const sfx = new Sfx();

/** 从设置同步音效开关与音量 */
export function applyAudioSettings(enabled: boolean, volume: number): void {
  sfx.enabled = enabled;
  sfx.volume = volume;
}
