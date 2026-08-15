// 音频服务：WebAudio 生成的极短音效（点击 / 资源升降 / 类别提示 / 结局）。
// 设计原因：文档 §7.2 要求点击音、资源升降音、类别提示音、结局短乐，并提供关闭夸张音效开关。
// 不依赖任何音频文件，纯振荡器合成，避免资源加载失败（§10.2）。
export class SoundService {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ac(): AudioContext | null {
    if (!this.enabled) return null;
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = g.AudioContext || g.webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor();
    return this.ctx;
  }

  private beep(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.05) {
    const ac = this.ac();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ac.destination);
    const t = ac.currentTime;
    osc.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    osc.stop(t + durMs / 1000);
  }

  toggle(on: boolean) {
    this.enabled = on;
  }
  click() {
    this.beep(420, 60, "square", 0.03);
  }
  resourceUp() {
    this.beep(660, 90, "sine", 0.05);
  }
  resourceDown() {
    this.beep(200, 120, "sawtooth", 0.05);
  }
  alert() {
    this.beep(120, 200, "square", 0.06);
  }
  win() {
    this.beep(523, 120);
    setTimeout(() => this.beep(659, 120), 120);
    setTimeout(() => this.beep(784, 160), 240);
  }
  lose() {
    this.beep(330, 160, "sawtooth", 0.06);
    setTimeout(() => this.beep(196, 240, "sawtooth", 0.06), 160);
  }
}

export const sound = new SoundService();
