// 轻量 WebAudio 合成音效：标记、正确、错误、提示、过关。无音频资源文件。
import { loadSettings } from "./settings";

type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure(): void {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = loadSettings().sfxVolume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    if (this.master) this.master.gain.value = v;
  }

  private play(tones: Tone[]): void {
    this.ensure();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const now = this.ctx.currentTime;
    for (const t of tones) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = t.type ?? "sine";
      osc.frequency.value = t.freq;
      const start = now + (t.delay ?? 0);
      const peak = t.gain ?? 0.25;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(start);
      osc.stop(start + t.dur + 0.02);
    }
  }

  click(): void {
    this.play([{ freq: 420, dur: 0.06, type: "triangle", gain: 0.15 }]);
  }
  mark(): void {
    this.play([{ freq: 660, dur: 0.08, type: "triangle", gain: 0.18 }]);
  }
  correct(): void {
    this.play([
      { freq: 523, dur: 0.12, type: "sine", gain: 0.22 },
      { freq: 784, dur: 0.16, type: "sine", gain: 0.22, delay: 0.1 },
    ]);
  }
  wrong(): void {
    // 错误不用强烈惩罚音，保持思考氛围（低沉短音）
    this.play([{ freq: 196, dur: 0.18, type: "sine", gain: 0.18 }]);
  }
  hint(): void {
    this.play([{ freq: 880, dur: 0.1, type: "triangle", gain: 0.16 }]);
  }
  win(): void {
    this.play([
      { freq: 523, dur: 0.14, type: "sine", gain: 0.22 },
      { freq: 659, dur: 0.14, type: "sine", gain: 0.22, delay: 0.12 },
      { freq: 784, dur: 0.22, type: "sine", gain: 0.22, delay: 0.24 },
    ]);
  }
}

export const sound = new SoundService();
