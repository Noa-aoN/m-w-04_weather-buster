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
let bgmNodes: { oscillators: OscillatorNode[]; gain: GainNode } | null = null;
let bgmInterval: number | null = null;
let bgmStep = 0;

const audioState = {
  sfxEnabled: true,
  bgmEnabled: true,
  masterVolume: 0.6,
};

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
  // Sharp crack: high-frequency noise that decays fast
  noiseBurst({ duration: 0.06, volume: 0.45, filter: 5200 });
  // Body / boom: low-frequency noise
  noiseBurst({ duration: 0.18, volume: 0.26, filter: 600 });
  // Sub thump
  tone({ freq: 70, duration: 0.05, type: "sine", volume: 0.42, attack: 0.001, release: 0.1 });
  // Mid pop snap
  tone({ freq: 220, duration: 0.04, type: "sawtooth", volume: 0.16, attack: 0.001, release: 0.05 });
  // High click
  tone({ freq: 1600, duration: 0.02, type: "square", volume: 0.18, attack: 0.001, release: 0.03, delay: 0.002 });
}

export function playHit(critical = false) {
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
  tone({ freq: 220, duration: 0.05, type: "sawtooth", volume: 0.08, release: 0.08 });
}

export function playSkill() {
  tone({ freq: 392, duration: 0.45, type: "sine", volume: 0.18, attack: 0.04, release: 0.4 });
  tone({ freq: 587.33, duration: 0.45, type: "sine", volume: 0.14, attack: 0.04, release: 0.4 });
  tone({ freq: 784, duration: 0.45, type: "triangle", volume: 0.12, attack: 0.04, release: 0.4 });
  tone({ freq: 1175, duration: 0.32, type: "sine", volume: 0.08, attack: 0.04, release: 0.34, delay: 0.06 });
}

export function playItem() {
  tone({ freq: 660, duration: 0.06, type: "sine", volume: 0.2, release: 0.12 });
  tone({ freq: 880, duration: 0.06, type: "sine", volume: 0.18, release: 0.12, delay: 0.07 });
  tone({ freq: 1175, duration: 0.06, type: "sine", volume: 0.14, release: 0.12, delay: 0.14 });
}

export function playMarkerSpawn() {
  tone({ freq: 280, duration: 0.07, type: "square", volume: 0.12, release: 0.1 });
  tone({ freq: 500, duration: 0.05, type: "triangle", volume: 0.08, release: 0.08, delay: 0.04 });
}

export function playMarkerImpact() {
  // Massive sub thump
  tone({ freq: 50, duration: 0.32, type: "sine", volume: 0.55, attack: 0.001, release: 0.32 });
  tone({ freq: 75, duration: 0.28, type: "triangle", volume: 0.34, attack: 0.002, release: 0.28 });
  // Mid-band crack
  tone({ freq: 220, duration: 0.12, type: "sawtooth", volume: 0.22, attack: 0.001, release: 0.14 });
  tone({ freq: 110, duration: 0.18, type: "square", volume: 0.18, release: 0.2, delay: 0.005 });
  // Multi-band noise: low rumble + mid splash + high crack
  noiseBurst({ duration: 0.4, volume: 0.42, filter: 240 });
  noiseBurst({ duration: 0.22, volume: 0.32, filter: 1200 });
  noiseBurst({ duration: 0.1, volume: 0.42, filter: 5800 });
  // Late tail rumble
  tone({ freq: 60, duration: 0.6, type: "sine", volume: 0.18, attack: 0.06, release: 0.6, delay: 0.12 });
}

export function playClear() {
  tone({ freq: 523.25, duration: 0.18, type: "sine", volume: 0.22, attack: 0.03, release: 0.22 });
  tone({ freq: 659.25, duration: 0.18, type: "sine", volume: 0.2, attack: 0.03, release: 0.22, delay: 0.12 });
  tone({ freq: 783.99, duration: 0.32, type: "triangle", volume: 0.22, attack: 0.04, release: 0.32, delay: 0.24 });
  tone({ freq: 1046.5, duration: 0.42, type: "sine", volume: 0.18, attack: 0.05, release: 0.4, delay: 0.36 });
}

export function playDefeat() {
  tone({ freq: 220, duration: 0.36, type: "sawtooth", volume: 0.18, attack: 0.04, release: 0.32 });
  tone({ freq: 165, duration: 0.42, type: "triangle", volume: 0.18, attack: 0.04, release: 0.4, delay: 0.18 });
  tone({ freq: 110, duration: 0.6, type: "sine", volume: 0.22, attack: 0.06, release: 0.55, delay: 0.36 });
}

export function playUiClick() {
  tone({ freq: 880, duration: 0.04, type: "triangle", volume: 0.1, release: 0.06 });
}

// Music in D minor: I i (Dm) - VI (Bb) - III (F) - VII (C) progression
// 4-bar loop, 2 sec per chord, eighth-note arpeggio at 240 BPM eighths
const BGM_PROGRESSION = [
  { root: 73.42, name: "Dm", arp: [146.83, 174.61, 220, 293.66, 220, 174.61, 146.83, 174.61] },   // D F A
  { root: 58.27, name: "Bb", arp: [116.54, 174.61, 233.08, 293.66, 233.08, 174.61, 116.54, 174.61] }, // Bb D F
  { root: 87.31, name: "F",  arp: [174.61, 220, 261.63, 349.23, 261.63, 220, 174.61, 220] },         // F A C
  { root: 65.41, name: "C",  arp: [130.81, 196, 246.94, 329.63, 246.94, 196, 130.81, 196] },          // C G E (use B as variant)
];
const BGM_BEAT_MS = 280;

export function startBgm() {
  if (!audioState.bgmEnabled || bgmNodes) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return;
  }

  // Pad: sustained low chord
  const padGain = ctx.createGain();
  padGain.gain.value = 0;
  padGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.2);
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 900;
  padFilter.Q.value = 0.7;
  padFilter.connect(padGain);
  padGain.connect(masterGain);
  const oscillators: OscillatorNode[] = [];
  const padChord = [73.42, 110, 146.83, 220];
  padChord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = idx === 0 ? "sine" : idx === 3 ? "triangle" : "sine";
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 6;
    osc.connect(padFilter);
    osc.start();
    oscillators.push(osc);
  });
  bgmNodes = { oscillators, gain: padGain };

  // Arpeggio: scheduled tones every BGM_BEAT_MS
  bgmStep = 0;
  if (bgmInterval !== null) {
    window.clearInterval(bgmInterval);
  }
  bgmInterval = window.setInterval(() => {
    if (!audioState.bgmEnabled || !bgmNodes || !context || !masterGain) {
      return;
    }
    const beatsPerChord = 8;
    const chordIndex = Math.floor(bgmStep / beatsPerChord) % BGM_PROGRESSION.length;
    const noteInChord = bgmStep % beatsPerChord;
    const chord = BGM_PROGRESSION[chordIndex];
    const note = chord.arp[noteInChord];
    bgmStep += 1;

    const arpGain = context.createGain();
    arpGain.gain.setValueAtTime(0, context.currentTime);
    arpGain.gain.linearRampToValueAtTime(0.045, context.currentTime + 0.01);
    arpGain.gain.linearRampToValueAtTime(0, context.currentTime + 0.32);
    const arpFilter = context.createBiquadFilter();
    arpFilter.type = "lowpass";
    arpFilter.frequency.value = 2400;
    arpFilter.connect(arpGain);
    arpGain.connect(masterGain);

    const osc = context.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(note, context.currentTime);
    osc.connect(arpFilter);
    osc.start();
    osc.stop(context.currentTime + 0.36);

    // Add bass note on chord change
    if (noteInChord === 0) {
      const bassGain = context.createGain();
      bassGain.gain.setValueAtTime(0, context.currentTime);
      bassGain.gain.linearRampToValueAtTime(0.07, context.currentTime + 0.02);
      bassGain.gain.linearRampToValueAtTime(0, context.currentTime + 1.6);
      bassGain.connect(masterGain);
      const bass = context.createOscillator();
      bass.type = "sine";
      bass.frequency.setValueAtTime(chord.root, context.currentTime);
      bass.connect(bassGain);
      bass.start();
      bass.stop(context.currentTime + 1.7);
    }
  }, BGM_BEAT_MS);
}

export function stopBgm() {
  if (bgmInterval !== null) {
    window.clearInterval(bgmInterval);
    bgmInterval = null;
  }
  if (!bgmNodes) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx) {
    return;
  }
  const fading = bgmNodes;
  bgmNodes = null;
  fading.gain.gain.cancelScheduledValues(ctx.currentTime);
  fading.gain.gain.setValueAtTime(fading.gain.gain.value, ctx.currentTime);
  fading.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  window.setTimeout(() => {
    for (const osc of fading.oscillators) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
  }, 480);
}

export function getAudioState() {
  return { ...audioState };
}
