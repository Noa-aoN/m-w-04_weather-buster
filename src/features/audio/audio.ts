import { assetUrl } from "../../shared/assets";

type Tone = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  detune?: number;
  delay?: number;
};

let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmBus: GainNode | null = null;
let bgmFilter: BiquadFilterNode | null = null;

const audioState = {
  sfxEnabled: true,
  bgmEnabled: false,
  masterVolume: 0.6,
  scene: "title" as BgmScene,
};

const sampleBuffers = new Map<string, AudioBuffer>();
let samplesLoaded = false;

const SAMPLE_FILES: Record<string, string[]> = {
  shoot: [
    "/audio/sfx/shoot-1.ogg",
    "/audio/sfx/shoot-2.ogg",
    "/audio/sfx/shoot-3.ogg",
    "/audio/sfx/shoot-4.ogg",
    "/audio/sfx/shoot-5.ogg",
  ],
  hit: ["/audio/sfx/hit-1.ogg", "/audio/sfx/hit-2.ogg", "/audio/sfx/hit-3.ogg"],
  critical: ["/audio/sfx/critical-1.ogg", "/audio/sfx/critical-2.ogg"],
  miss: ["/audio/sfx/miss-1.ogg"],
  skill: ["/audio/sfx/skill-1.ogg", "/audio/sfx/skill-2.ogg"],
  item: ["/audio/sfx/item-1.ogg"],
  markerSpawn: ["/audio/sfx/marker-spawn.ogg"],
  impact: ["/audio/sfx/impact-1.ogg", "/audio/sfx/impact-2.ogg"],
  clear: ["/audio/sfx/clear-1.ogg"],
  defeat: ["/audio/sfx/defeat-1.ogg"],
  uiClick: ["/audio/sfx/ui-click.ogg"],
  // Kenney Sci-Fi Sounds (CC0). Used to upgrade synth-only events to real
  // recorded sci-fi audio without disturbing the curated samples above.
  chargeFire: [
    "/audio/sfx-kenney/lowFrequency_explosion_000.ogg",
    "/audio/sfx-kenney/lowFrequency_explosion_001.ogg",
  ],
  shieldBlock: [
    "/audio/sfx-kenney/forceField_000.ogg",
    "/audio/sfx-kenney/forceField_001.ogg",
    "/audio/sfx-kenney/forceField_002.ogg",
  ],
  reloadOpen: ["/audio/sfx-kenney/doorOpen_000.ogg", "/audio/sfx-kenney/doorOpen_001.ogg"],
  reloadClose: ["/audio/sfx-kenney/doorClose_000.ogg", "/audio/sfx-kenney/doorClose_001.ogg"],
  bigImpact: [
    "/audio/sfx-kenney/explosionCrunch_000.ogg",
    "/audio/sfx-kenney/explosionCrunch_001.ogg",
    "/audio/sfx-kenney/explosionCrunch_002.ogg",
  ],
  metalHit: [
    "/audio/sfx-kenney/impactMetal_000.ogg",
    "/audio/sfx-kenney/impactMetal_001.ogg",
    "/audio/sfx-kenney/impactMetal_002.ogg",
  ],
};

async function loadOneSample(url: string) {
  if (sampleBuffers.has(url)) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx) {
    return;
  }
  try {
    const response = await fetch(assetUrl(url));
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    sampleBuffers.set(url, buffer);
  } catch {
    // ignore failures (network / decode)
  }
}

export async function loadSamples() {
  if (samplesLoaded) {
    return;
  }
  samplesLoaded = true;
  const ctx = ensureContext();
  if (!ctx) {
    return;
  }
  const all = Object.values(SAMPLE_FILES).flat();
  await Promise.all(all.map((url) => loadOneSample(url)));
}

function playBuffer(url: string, volume: number, delay = 0) {
  if (!audioState.sfxEnabled) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return;
  }
  const buffer = sampleBuffers.get(url);
  if (!buffer) {
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(masterGain);
  source.start(ctx.currentTime + delay);
}

function playRandomSample(category: keyof typeof SAMPLE_FILES, volume: number) {
  const list = SAMPLE_FILES[category];
  if (!list || list.length === 0) {
    return;
  }
  const url = list[Math.floor(Math.random() * list.length)];
  playBuffer(url, volume);
}

function playBufferDelayed(category: keyof typeof SAMPLE_FILES, delay: number, volume: number) {
  const list = SAMPLE_FILES[category];
  if (!list || list.length === 0) {
    return;
  }
  const url = list[Math.floor(Math.random() * list.length)];
  playBuffer(url, volume, delay);
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!context) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    context = new Ctor();
    masterGain = context.createGain();
    masterGain.gain.value = audioState.masterVolume;
    masterGain.connect(context.destination);
  }
  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }
  return context;
}

export function setSfxEnabled(value: boolean) {
  audioState.sfxEnabled = value;
}

export function setBgmEnabled(value: boolean) {
  audioState.bgmEnabled = value;
  if (value) {
    startBgm();
  } else {
    stopBgm();
  }
}

export function setMasterVolume(value: number) {
  audioState.masterVolume = Math.max(0, Math.min(1, value));
  if (masterGain) {
    masterGain.gain.value = audioState.masterVolume;
  }
}

function tone({
  freq,
  duration,
  type = "sine",
  volume = 0.3,
  attack = 0.005,
  release = 0.08,
  detune = 0,
  delay = 0,
}: Tone) {
  if (!audioState.sfxEnabled) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return;
  }
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (detune) {
    osc.detune.setValueAtTime(detune, start);
  }
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + attack);
  gain.gain.linearRampToValueAtTime(0, start + duration + release);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + release + 0.05);
}

function noiseBurst({
  duration,
  volume = 0.3,
  filter = 1500,
  delay = 0,
}: {
  duration: number;
  volume?: number;
  filter?: number;
  delay?: number;
}) {
  if (!audioState.sfxEnabled) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return;
  }
  const start = ctx.currentTime + delay;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const biquad = ctx.createBiquadFilter();
  biquad.type = "lowpass";
  biquad.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  source.connect(biquad);
  biquad.connect(gain);
  gain.connect(masterGain);
  source.start(start);
  source.stop(start + duration + 0.02);
}

export function playShoot() {
  if (sampleBuffers.size > 0) {
    playRandomSample("shoot", 0.7);
    return;
  }
  noiseBurst({ duration: 0.06, volume: 0.45, filter: 5200 });
  noiseBurst({ duration: 0.18, volume: 0.26, filter: 600 });
  tone({ freq: 70, duration: 0.05, type: "sine", volume: 0.42, attack: 0.001, release: 0.1 });
  tone({ freq: 220, duration: 0.04, type: "sawtooth", volume: 0.16, attack: 0.001, release: 0.05 });
  tone({ freq: 1600, duration: 0.02, type: "square", volume: 0.18, attack: 0.001, release: 0.03, delay: 0.002 });
}

export function playSlash() {
  noiseBurst({ duration: 0.08, volume: 0.3, filter: 7200 });
  noiseBurst({ duration: 0.16, volume: 0.18, filter: 2600, delay: 0.02 });
  tone({ freq: 980, duration: 0.05, type: "sawtooth", volume: 0.16, attack: 0.001, release: 0.08 });
  tone({ freq: 420, duration: 0.08, type: "triangle", volume: 0.14, attack: 0.001, release: 0.12, delay: 0.035 });
  tone({ freq: 180, duration: 0.05, type: "sine", volume: 0.12, attack: 0.001, release: 0.12, delay: 0.08 });
}

export function playHit(critical = false) {
  if (sampleBuffers.size > 0) {
    if (critical) {
      playRandomSample("critical", 0.85);
      playRandomSample("hit", 0.5);
    } else {
      playRandomSample("hit", 0.7);
    }
    return;
  }
  if (critical) {
    tone({ freq: 940, duration: 0.06, type: "triangle", volume: 0.32 });
    tone({ freq: 1320, duration: 0.05, type: "sine", volume: 0.22, delay: 0.02 });
    tone({ freq: 1840, duration: 0.06, type: "sine", volume: 0.16, delay: 0.04 });
  } else {
    tone({ freq: 540, duration: 0.06, type: "triangle", volume: 0.22 });
    tone({ freq: 380, duration: 0.04, type: "sine", volume: 0.14 });
  }
}

export function playMiss() {
  if (sampleBuffers.size > 0) {
    playRandomSample("miss", 0.45);
    return;
  }
  tone({ freq: 220, duration: 0.05, type: "sawtooth", volume: 0.08, release: 0.08 });
}

export function playSkill() {
  if (sampleBuffers.size > 0) {
    playRandomSample("skill", 0.7);
    return;
  }
  tone({ freq: 392, duration: 0.45, type: "sine", volume: 0.18, attack: 0.04, release: 0.4 });
  tone({ freq: 587.33, duration: 0.45, type: "sine", volume: 0.14, attack: 0.04, release: 0.4 });
  tone({ freq: 784, duration: 0.45, type: "triangle", volume: 0.12, attack: 0.04, release: 0.4 });
  tone({ freq: 1175, duration: 0.32, type: "sine", volume: 0.08, attack: 0.04, release: 0.34, delay: 0.06 });
}

export function playItem() {
  if (sampleBuffers.size > 0) {
    playRandomSample("item", 0.7);
    return;
  }
  tone({ freq: 660, duration: 0.06, type: "sine", volume: 0.2, release: 0.12 });
  tone({ freq: 880, duration: 0.06, type: "sine", volume: 0.18, release: 0.12, delay: 0.07 });
  tone({ freq: 1175, duration: 0.06, type: "sine", volume: 0.14, release: 0.12, delay: 0.14 });
}

export function playMarkerSpawn() {
  if (sampleBuffers.size > 0) {
    playRandomSample("markerSpawn", 0.55);
    return;
  }
  tone({ freq: 280, duration: 0.07, type: "square", volume: 0.12, release: 0.1 });
  tone({ freq: 500, duration: 0.05, type: "triangle", volume: 0.08, release: 0.08, delay: 0.04 });
}

export function playMarkerImpact() {
  if (sampleBuffers.size > 0) {
    playRandomSample("impact", 0.7);
    playRandomSample("bigImpact", 0.55);
    tone({ freq: 50, duration: 0.32, type: "sine", volume: 0.32, attack: 0.001, release: 0.32 });
    return;
  }
  tone({ freq: 50, duration: 0.32, type: "sine", volume: 0.55, attack: 0.001, release: 0.32 });
  tone({ freq: 75, duration: 0.28, type: "triangle", volume: 0.34, attack: 0.002, release: 0.28 });
  tone({ freq: 220, duration: 0.12, type: "sawtooth", volume: 0.22, attack: 0.001, release: 0.14 });
  tone({ freq: 110, duration: 0.18, type: "square", volume: 0.18, release: 0.2, delay: 0.005 });
  noiseBurst({ duration: 0.4, volume: 0.42, filter: 240 });
  noiseBurst({ duration: 0.22, volume: 0.32, filter: 1200 });
  noiseBurst({ duration: 0.1, volume: 0.42, filter: 5800 });
  tone({ freq: 60, duration: 0.6, type: "sine", volume: 0.18, attack: 0.06, release: 0.6, delay: 0.12 });
}

export function playShieldBlock() {
  if (sampleBuffers.size > 0) {
    playRandomSample("shieldBlock", 0.55);
    tone({ freq: 1080, duration: 0.04, type: "square", volume: 0.06, attack: 0.001, release: 0.08, delay: 0.02 });
    return;
  }
  tone({ freq: 180, duration: 0.08, type: "triangle", volume: 0.2, attack: 0.001, release: 0.14 });
  tone({ freq: 540, duration: 0.09, type: "sine", volume: 0.16, attack: 0.002, release: 0.12, delay: 0.015 });
  tone({ freq: 1080, duration: 0.04, type: "square", volume: 0.08, attack: 0.001, release: 0.08, delay: 0.035 });
  noiseBurst({ duration: 0.14, volume: 0.14, filter: 1800 });
}

export function playEnemyStagger(critical = false) {
  if (critical) {
    tone({ freq: 1220, duration: 0.05, type: "triangle", volume: 0.22, release: 0.1 });
    tone({ freq: 760, duration: 0.07, type: "sawtooth", volume: 0.16, release: 0.13, delay: 0.025 });
  } else {
    tone({ freq: 620, duration: 0.05, type: "triangle", volume: 0.14, release: 0.1 });
  }
  noiseBurst({ duration: 0.08, volume: critical ? 0.18 : 0.1, filter: 4200 });
}

export function playClear() {
  if (sampleBuffers.size > 0) {
    playRandomSample("clear", 0.85);
  }
  // Also layer a short synthesized triumphant arpeggio so it feels bigger
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return;
  }
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
  notes.forEach((f, i) => {
    tone({
      freq: f,
      duration: 0.18,
      type: "triangle",
      volume: 0.18,
      attack: 0.005,
      release: 0.32,
      delay: 0.05 + i * 0.07,
    });
    if (i === 0 || i === 3 || i === 5) {
      tone({
        freq: f / 2,
        duration: 0.5,
        type: "sine",
        volume: 0.14,
        attack: 0.01,
        release: 0.4,
        delay: 0.05 + i * 0.07,
      });
    }
  });
}

export function playDefeat() {
  if (sampleBuffers.size > 0) {
    playRandomSample("defeat", 0.85);
    return;
  }
  tone({ freq: 220, duration: 0.36, type: "sawtooth", volume: 0.18, attack: 0.04, release: 0.32 });
  tone({ freq: 165, duration: 0.42, type: "triangle", volume: 0.18, attack: 0.04, release: 0.4, delay: 0.18 });
  tone({ freq: 110, duration: 0.6, type: "sine", volume: 0.22, attack: 0.06, release: 0.55, delay: 0.36 });
}

export function playUiClick() {
  if (sampleBuffers.size > 0) {
    playRandomSample("uiClick", 0.32);
    return;
  }
  tone({ freq: 880, duration: 0.04, type: "triangle", volume: 0.1, release: 0.06 });
}

export function playReload() {
  if (sampleBuffers.size > 0) {
    // clip out → clip in → charge
    playRandomSample("reloadOpen", 0.45);
    playBufferDelayed("reloadClose", 0.18, 0.55);
    tone({ freq: 1320, duration: 0.07, type: "triangle", volume: 0.14, release: 0.12, delay: 0.36 });
    return;
  }
  // Multi-stage: clip out, clip in, charge.
  noiseBurst({ duration: 0.05, volume: 0.18, filter: 4400 });
  tone({ freq: 320, duration: 0.07, type: "square", volume: 0.16, release: 0.1 });
  noiseBurst({ duration: 0.06, volume: 0.18, filter: 5200, delay: 0.18 });
  tone({ freq: 540, duration: 0.05, type: "triangle", volume: 0.16, release: 0.08, delay: 0.18 });
  tone({ freq: 880, duration: 0.05, type: "sine", volume: 0.18, release: 0.1, delay: 0.34 });
  tone({ freq: 1320, duration: 0.07, type: "triangle", volume: 0.14, release: 0.12, delay: 0.42 });
}

export function playLowAmmoBeep() {
  tone({ freq: 1320, duration: 0.05, type: "square", volume: 0.12, release: 0.06 });
  tone({ freq: 1760, duration: 0.05, type: "sine", volume: 0.08, release: 0.06, delay: 0.06 });
}

export function playBlocked() {
  if (sampleBuffers.size > 0) {
    playRandomSample("metalHit", 0.6);
    return;
  }
  // Metallic "tink" — high steel hit + fast filtered noise
  tone({ freq: 2400, duration: 0.05, type: "triangle", volume: 0.18, attack: 0.001, release: 0.06 });
  tone({ freq: 1700, duration: 0.06, type: "sine", volume: 0.12, attack: 0.001, release: 0.08, delay: 0.005 });
  noiseBurst({ duration: 0.06, volume: 0.14, filter: 4800 });
}

export function playEnemyChargeStart() {
  // Rising pitch warble + low rumble
  tone({ freq: 220, duration: 0.6, type: "sawtooth", volume: 0.14, attack: 0.05, release: 0.4 });
  tone({ freq: 440, duration: 0.6, type: "triangle", volume: 0.1, attack: 0.05, release: 0.4, delay: 0.04 });
  // Rising siren (short)
  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  const start = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, start);
  osc.frequency.linearRampToValueAtTime(720, start + 1.0);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(0.18, start + 0.06);
  g.gain.linearRampToValueAtTime(0, start + 1.05);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(start);
  osc.stop(start + 1.1);
}

export function playEnemyChargeFire() {
  if (sampleBuffers.size > 0) {
    playRandomSample("chargeFire", 0.95);
    // sub layer for body
    tone({ freq: 60, duration: 0.32, type: "sine", volume: 0.32, attack: 0.001, release: 0.36 });
    return;
  }
  // Deep bass hit + crash
  tone({ freq: 60, duration: 0.32, type: "sine", volume: 0.45, attack: 0.001, release: 0.36 });
  tone({ freq: 120, duration: 0.22, type: "triangle", volume: 0.32, attack: 0.001, release: 0.26 });
  noiseBurst({ duration: 0.4, volume: 0.34, filter: 800 });
  noiseBurst({ duration: 0.18, volume: 0.42, filter: 6000 });
  tone({ freq: 240, duration: 0.18, type: "sawtooth", volume: 0.18, attack: 0.001, release: 0.18, delay: 0.005 });
}

export function playCountdownTick() {
  tone({ freq: 1320, duration: 0.06, type: "triangle", volume: 0.22, release: 0.12 });
  tone({ freq: 880, duration: 0.05, type: "sine", volume: 0.14, release: 0.1, delay: 0.005 });
}

export function playCountdownGo() {
  tone({ freq: 880, duration: 0.18, type: "triangle", volume: 0.28, attack: 0.005, release: 0.3 });
  tone({ freq: 1320, duration: 0.16, type: "sine", volume: 0.22, attack: 0.01, release: 0.3, delay: 0.04 });
  tone({ freq: 1760, duration: 0.18, type: "triangle", volume: 0.18, attack: 0.01, release: 0.32, delay: 0.08 });
  noiseBurst({ duration: 0.18, volume: 0.18, filter: 5200 });
}

// ===== BGM Engine =====
// Step-sequenced multi-track player. Switches scenes (title/battle/victory/defeat).

export type BgmScene = "title" | "battle" | "victory" | "defeat";

type DrumStep = "K" | "S" | "H" | "O" | ".";

type BgmTrack = {
  bpm: number;
  // 16-step bar repeated. arrays describe full pattern length (multiple of 16).
  bass: Array<number | null>;
  lead: Array<number | null>;
  pad: number[][]; // each chord = 4 freqs. one chord per 16 steps.
  drums: DrumStep[];
  filterCutoff: number;
  volume: number;
};

// Frequency helpers (note name -> Hz). Equal temperament A4=440.
const A4 = 440;
const NOTE_INDEX: Record<string, number> = {
  C: -9, "C#": -8, Db: -8,
  D: -7, "D#": -6, Eb: -6,
  E: -5,
  F: -4, "F#": -3, Gb: -3,
  G: -2, "G#": -1, Ab: -1,
  A: 0, "A#": 1, Bb: 1,
  B: 2,
};
function n(name: string): number {
  // e.g. "A4", "C#5", "Eb3"
  const match = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!match) return A4;
  const semis = NOTE_INDEX[match[1]];
  const octave = parseInt(match[2], 10);
  const semitones = semis + (octave - 4) * 12;
  return A4 * Math.pow(2, semitones / 12);
}

// ----- Scene patterns -----

// Title: 110 BPM, hopeful in C major (C-G-Am-F).
// 32 steps (2 bars). Build energy via lead arpeggio.
const TITLE: BgmTrack = (() => {
  const bass: Array<number | null> = new Array(32).fill(null);
  const lead: Array<number | null> = new Array(32).fill(null);
  const drums: DrumStep[] = new Array(32).fill(".");
  // Bar 1: C ... G ...   Bar 2: Am ... F ...
  // Step 0 = C2, step 4 = C3, step 8 = G2, step 12 = G3
  const bassPattern = (root: string, oct: number) => {
    const r = n(`${root}${oct}`);
    return [r, r * 1.5, r * 2, r * 1.5];
  };
  const placeBass = (start: number, root: string, oct: number) => {
    const pat = bassPattern(root, oct);
    for (let i = 0; i < 4; i += 1) bass[start + i * 2] = pat[i];
  };
  placeBass(0, "C", 2);
  placeBass(8, "G", 2);
  placeBass(16, "A", 2);
  placeBass(24, "F", 2);

  // Lead arpeggios: triads, 8th notes
  const arpFor = (root: string, third: string, fifth: string, oct: number): number[] => [
    n(`${root}${oct}`), n(`${third}${oct}`), n(`${fifth}${oct}`), n(`${root}${oct + 1}`),
    n(`${fifth}${oct}`), n(`${third}${oct}`), n(`${fifth}${oct}`), n(`${root}${oct + 1}`),
  ];
  const placeLead = (start: number, arp: number[]) => {
    for (let i = 0; i < 8; i += 1) lead[start + i] = arp[i];
  };
  placeLead(0, arpFor("C", "E", "G", 4));
  placeLead(8, arpFor("G", "B", "D", 4));
  placeLead(16, arpFor("A", "C", "E", 4));
  placeLead(24, arpFor("F", "A", "C", 4));

  // Drums: gentle 4-on-floor with hat 8ths and snare on 2 & 4
  for (let bar = 0; bar < 2; bar += 1) {
    const off = bar * 16;
    drums[off + 0] = "K";
    drums[off + 4] = "S";
    drums[off + 8] = "K";
    drums[off + 12] = "S";
    for (let i = 0; i < 16; i += 2) {
      if (drums[off + i] === ".") drums[off + i] = "H";
    }
  }

  const pad = [
    [n("C3"), n("E3"), n("G3"), n("C4")],
    [n("G2"), n("D3"), n("G3"), n("B3")],
    [n("A2"), n("C3"), n("E3"), n("A3")],
    [n("F2"), n("A2"), n("C3"), n("F3")],
  ];

  return { bpm: 110, bass, lead, pad, drums, filterCutoff: 2400, volume: 0.34 };
})();

// Battle: 138 BPM, driving in A minor (Am-F-C-G).
// 32 steps. Heavy kick + busy lead.
const BATTLE: BgmTrack = (() => {
  const bass: Array<number | null> = new Array(32).fill(null);
  const lead: Array<number | null> = new Array(32).fill(null);
  const drums: DrumStep[] = new Array(32).fill(".");

  // Bass: 8th-note octave bouncing root
  const placeBass = (start: number, root: string) => {
    const r1 = n(`${root}2`);
    const r2 = n(`${root}3`);
    for (let i = 0; i < 8; i += 1) {
      bass[start + i] = i % 2 === 0 ? r1 : r2;
    }
  };
  placeBass(0, "A");
  placeBass(8, "F");
  placeBass(16, "C");
  placeBass(24, "G");

  // Lead: minor pentatonic 16th-note flourishes
  const am = ["A4", "C5", "D5", "E5", "G5", "A5", "G5", "E5"];
  const dm = ["F4", "A4", "C5", "D5", "F5", "D5", "C5", "A4"];
  const cM = ["C5", "E5", "G5", "A5", "G5", "E5", "C5", "G4"];
  const g7 = ["G4", "B4", "D5", "F5", "E5", "D5", "B4", "G4"];
  const placeLead = (start: number, names: string[]) => {
    for (let i = 0; i < 8; i += 1) lead[start + i] = n(names[i]);
  };
  placeLead(0, am);
  placeLead(8, dm);
  placeLead(16, cM);
  placeLead(24, g7);

  // Drums: rock pattern. Kick 1+3+sometimes, snare 2+4, hihat 8ths with open on syncopated steps.
  for (let bar = 0; bar < 2; bar += 1) {
    const off = bar * 16;
    drums[off + 0] = "K";
    drums[off + 4] = "S";
    drums[off + 6] = "K";
    drums[off + 8] = "K";
    drums[off + 12] = "S";
    drums[off + 14] = "K";
    for (let i = 0; i < 16; i += 2) {
      if (drums[off + i] === ".") drums[off + i] = i === 14 ? "O" : "H";
    }
  }

  const pad = [
    [n("A2"), n("C3"), n("E3"), n("A3")],
    [n("F2"), n("A2"), n("C3"), n("F3")],
    [n("C3"), n("E3"), n("G3"), n("C4")],
    [n("G2"), n("B2"), n("D3"), n("G3")],
  ];

  return { bpm: 138, bass, lead, pad, drums, filterCutoff: 3200, volume: 0.4 };
})();

// Victory: short major fanfare loop (D major), 120 BPM
const VICTORY: BgmTrack = (() => {
  const bass: Array<number | null> = new Array(16).fill(null);
  const lead: Array<number | null> = new Array(16).fill(null);
  const drums: DrumStep[] = new Array(16).fill(".");

  bass[0] = n("D2"); bass[2] = n("D2");
  bass[4] = n("A2"); bass[6] = n("A2");
  bass[8] = n("B2"); bass[10] = n("B2");
  bass[12] = n("D3"); bass[14] = n("A2");

  const fanfare = ["D5", "F#5", "A5", "D6", "A5", "F#5", "A5", "D6", "F#5", "A5", "D6", "F#6", "A5", "F#5", "D5", "A4"];
  fanfare.forEach((note, i) => { lead[i] = n(note); });

  drums[0] = "K"; drums[4] = "S"; drums[8] = "K"; drums[12] = "S";
  drums[14] = "O";
  for (let i = 0; i < 16; i += 2) if (drums[i] === ".") drums[i] = "H";

  const pad = [
    [n("D3"), n("F#3"), n("A3"), n("D4")],
    [n("A2"), n("C#3"), n("E3"), n("A3")],
    [n("B2"), n("D3"), n("F#3"), n("B3")],
    [n("D3"), n("F#3"), n("A3"), n("D4")],
  ];

  return { bpm: 120, bass, lead, pad, drums, filterCutoff: 3600, volume: 0.36 };
})();

// Defeat: slow descending minor (D minor), 70 BPM
const DEFEAT: BgmTrack = (() => {
  const bass: Array<number | null> = new Array(16).fill(null);
  const lead: Array<number | null> = new Array(16).fill(null);
  const drums: DrumStep[] = new Array(16).fill(".");

  bass[0] = n("D2"); bass[4] = n("C2"); bass[8] = n("Bb1"); bass[12] = n("A1");

  const fall = ["D5", null, "C5", null, "Bb4", null, "A4", null, "G4", null, "F4", null, "E4", null, "D4", null];
  fall.forEach((name, i) => { if (name) lead[i] = n(name); });

  drums[0] = "K"; drums[8] = "S";
  drums[6] = "H"; drums[14] = "H";

  const pad = [
    [n("D3"), n("F3"), n("A3"), n("D4")],
    [n("C3"), n("E3"), n("G3"), n("C4")],
    [n("Bb2"), n("D3"), n("F3"), n("Bb3")],
    [n("A2"), n("C3"), n("E3"), n("A3")],
  ];

  return { bpm: 70, bass, lead, pad, drums, filterCutoff: 1400, volume: 0.28 };
})();

const SCENE_TRACK: Record<BgmScene, BgmTrack> = {
  title: TITLE,
  battle: BATTLE,
  victory: VICTORY,
  defeat: DEFEAT,
};

let bgmRunning = false;
let bgmTimer: number | null = null;
let bgmStep = 0;
let bgmSceneActive: BgmScene = "title";

function ensureBgmBus(): { bus: GainNode; filter: BiquadFilterNode } | null {
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return null;
  }
  if (!bgmBus || !bgmFilter) {
    bgmFilter = ctx.createBiquadFilter();
    bgmFilter.type = "lowpass";
    bgmFilter.frequency.value = 2400;
    bgmFilter.Q.value = 0.6;
    bgmBus = ctx.createGain();
    bgmBus.gain.value = 0;
    bgmFilter.connect(bgmBus);
    bgmBus.connect(masterGain);
  }
  return { bus: bgmBus, filter: bgmFilter };
}

function fadeBgmTo(targetVolume: number, durationSec: number) {
  const ctx = ensureContext();
  const bus = bgmBus;
  if (!ctx || !bus) {
    return;
  }
  const t = ctx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(bus.gain.value, t);
  bus.gain.linearRampToValueAtTime(targetVolume, t + durationSec);
}

function playKick(at: number, ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.16);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.85, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(at);
  osc.stop(at + 0.26);
  // body click
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "triangle";
  click.frequency.setValueAtTime(2200, at);
  clickGain.gain.setValueAtTime(0.18, at);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
  click.connect(clickGain);
  clickGain.connect(dest);
  click.start(at);
  click.stop(at + 0.04);
}

function playSnare(at: number, ctx: AudioContext, dest: AudioNode) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.42, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
  source.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  source.start(at);
  source.stop(at + 0.2);
  // tonal body
  const tone1 = ctx.createOscillator();
  const tg = ctx.createGain();
  tone1.type = "triangle";
  tone1.frequency.setValueAtTime(220, at);
  tone1.frequency.exponentialRampToValueAtTime(140, at + 0.08);
  tg.gain.setValueAtTime(0.18, at);
  tg.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
  tone1.connect(tg);
  tg.connect(dest);
  tone1.start(at);
  tone1.stop(at + 0.12);
}

function playHat(at: number, ctx: AudioContext, dest: AudioNode, open = false) {
  const dur = open ? 0.18 : 0.04;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const gain = ctx.createGain();
  const peak = open ? 0.16 : 0.12;
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0005, at + dur);
  source.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  source.start(at);
  source.stop(at + dur + 0.02);
}

function playPadChord(chord: number[], at: number, durationSec: number, ctx: AudioContext, dest: AudioNode) {
  chord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, at);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 6, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.045, at + 0.4);
    gain.gain.linearRampToValueAtTime(0.04, at + durationSec - 0.2);
    gain.gain.linearRampToValueAtTime(0, at + durationSec);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(at);
    osc.stop(at + durationSec + 0.1);
  });
}

function playLeadNote(freq: number, at: number, durationSec: number, ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.13, at + 0.008);
  gain.gain.linearRampToValueAtTime(0.085, at + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0005, at + durationSec);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(at);
  osc.stop(at + durationSec + 0.04);
  // sub harmonic for sparkle
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, at);
  gain2.gain.setValueAtTime(0, at);
  gain2.gain.linearRampToValueAtTime(0.04, at + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.0005, at + durationSec * 0.7);
  osc2.connect(gain2);
  gain2.connect(dest);
  osc2.start(at);
  osc2.stop(at + durationSec + 0.04);
}

function playBassNote(freq: number, at: number, durationSec: number, ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, at);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(800, at);
  lp.frequency.exponentialRampToValueAtTime(360, at + durationSec);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.18, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, at + durationSec);
  osc.connect(lp);
  lp.connect(gain);
  gain.connect(dest);
  osc.start(at);
  osc.stop(at + durationSec + 0.04);
  // sub
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(freq, at);
  subGain.gain.setValueAtTime(0, at);
  subGain.gain.linearRampToValueAtTime(0.13, at + 0.005);
  subGain.gain.exponentialRampToValueAtTime(0.0005, at + durationSec);
  sub.connect(subGain);
  subGain.connect(dest);
  sub.start(at);
  sub.stop(at + durationSec + 0.04);
}

export function setBgmScene(scene: BgmScene) {
  if (audioState.scene === scene) {
    return;
  }
  audioState.scene = scene;
  bgmSceneActive = scene;
  bgmStep = 0;
  if (bgmFilter) {
    const ctx = ensureContext();
    if (ctx) {
      const t = ctx.currentTime;
      bgmFilter.frequency.cancelScheduledValues(t);
      bgmFilter.frequency.setValueAtTime(bgmFilter.frequency.value, t);
      bgmFilter.frequency.linearRampToValueAtTime(SCENE_TRACK[scene].filterCutoff, t + 0.4);
    }
  }
  if (bgmRunning && audioState.bgmEnabled) {
    fadeBgmTo(SCENE_TRACK[scene].volume, 0.6);
    restartBgmTimer();
  }
}

function restartBgmTimer() {
  if (bgmTimer !== null) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
  const track = SCENE_TRACK[bgmSceneActive];
  const stepMs = 60000 / track.bpm / 4; // 16th note duration
  bgmTimer = window.setInterval(stepBgm, stepMs);
}

function stepBgm() {
  if (!audioState.bgmEnabled || !bgmRunning) {
    return;
  }
  const ctx = ensureContext();
  const bus = ensureBgmBus();
  if (!ctx || !bus) {
    return;
  }
  const track = SCENE_TRACK[bgmSceneActive];
  const stepDur = 60 / track.bpm / 4;
  const len = track.bass.length;
  const idx = bgmStep % len;
  const at = ctx.currentTime + 0.02;

  // Pad: trigger at chord boundaries (every 8 steps)
  if (idx % 8 === 0) {
    const chordIdx = (idx / 8) % track.pad.length;
    const chord = track.pad[chordIdx];
    playPadChord(chord, at, stepDur * 8, ctx, bus.filter);
  }

  // Bass
  const bassNote = track.bass[idx];
  if (bassNote) {
    playBassNote(bassNote, at, stepDur * 1.6, ctx, bus.filter);
  }

  // Lead
  const leadNote = track.lead[idx];
  if (leadNote) {
    playLeadNote(leadNote, at, stepDur * 1.5, ctx, bus.filter);
  }

  // Drums (route around the scene-LP filter so they stay punchy)
  const drumDest = bus.bus;
  const d = track.drums[idx];
  if (d === "K") playKick(at, ctx, drumDest);
  else if (d === "S") playSnare(at, ctx, drumDest);
  else if (d === "H") playHat(at, ctx, drumDest, false);
  else if (d === "O") playHat(at, ctx, drumDest, true);

  bgmStep += 1;
}

export function startBgm() {
  if (!audioState.bgmEnabled || bgmRunning) {
    return;
  }
  const ctx = ensureContext();
  const bus = ensureBgmBus();
  if (!ctx || !bus) {
    return;
  }
  bgmRunning = true;
  fadeBgmTo(SCENE_TRACK[bgmSceneActive].volume, 0.8);
  restartBgmTimer();
}

export function stopBgm() {
  if (!bgmRunning) {
    if (bgmBus) {
      fadeBgmTo(0, 0.3);
    }
    return;
  }
  bgmRunning = false;
  fadeBgmTo(0, 0.4);
  if (bgmTimer !== null) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

export function getAudioState() {
  return { ...audioState };
}
