// Tiny synthesized sound effects via the Web Audio API: no audio files to download.
// The AudioContext is only created on the first user gesture (browsers block autoplay).

export type SoundName =
  | 'click'
  | 'spin'
  | 'stop'
  | 'rare'
  | 'pattern'
  | 'win'
  | 'bigWin'
  | 'jackpot'
  | 'total'
  | 'upgrade'
  | 'unlock'
  | 'error';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = volume * 0.35;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from a user-gesture handler to create/resume the audio context. */
export function unlockAudio(): void {
  if (!enabled) return;
  const c = getCtx();
  if (c?.state === 'suspended') void c.resume();
}

export function configureSound(opts: { enabled: boolean; volume: number }): void {
  enabled = opts.enabled;
  volume = opts.volume;
  if (master) master.gain.value = volume * 0.35;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', peak = 1, slideTo?: number) {
  const c = ctx!;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const notes = (seq: number[], step: number, type: OscillatorType = 'triangle', dur = 0.16) =>
  seq.forEach((f, i) => tone(f, i * step, dur, type, 0.8));

const SOUNDS: Record<SoundName, (step: number) => void> = {
  click: () => tone(660, 0, 0.05, 'square', 0.25),
  spin: () => {
    for (let i = 0; i < 10; i++) tone(220 + (i % 2) * 40, i * 0.07, 0.04, 'square', 0.12);
  },
  stop: () => tone(180, 0, 0.09, 'triangle', 0.6, 90),
  rare: () => notes([1319, 1568, 2093], 0.05, 'sine', 0.3),
  // Rises a step for each pattern in the showcase.
  pattern: (step) => tone(523 * Math.pow(2, step / 6), 0, 0.12, 'triangle', 0.5),
  win: () => notes([523, 659, 784], 0.08),
  bigWin: () => notes([523, 659, 784, 1047, 784, 1047], 0.08),
  jackpot: () => notes([392, 523, 659, 784, 1047, 1319, 1568, 1319, 1568], 0.09, 'square', 0.18),
  // Cash-register style flourish for the TOTAL takeover.
  total: () => {
    notes([784, 1047, 1319], 0.06, 'square', 0.1);
    for (let i = 0; i < 6; i++) tone(2093 + (i % 2) * 300, 0.2 + i * 0.05, 0.05, 'triangle', 0.25);
  },
  upgrade: () => tone(440, 0, 0.25, 'sine', 0.7, 880),
  unlock: () => notes([784, 988, 1175, 1568], 0.07, 'sine', 0.25),
  error: () => tone(160, 0, 0.15, 'sawtooth', 0.25, 120),
};

export function playSound(name: SoundName, step = 0): void {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  try {
    SOUNDS[name](step);
  } catch {
    /* audio is decorative; never break gameplay */
  }
}
