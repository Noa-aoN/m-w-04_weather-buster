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
  tone({ freq: 720, duration: 0.04, type: "square", volume: 0.16, release: 0.05 });
  tone({ freq: 110, duration: 0.07, type: "sine", volume: 0.22, release: 0.1 });
  noiseBurst({ duration: 0.05, volume: 0.12, filter: 2400 });
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
  tone({ freq: 70, duration: 0.18, type: "sine", volume: 0.34, release: 0.2 });
  tone({ freq: 110, duration: 0.16, type: "triangle", volume: 0.22, release: 0.18 });
  noiseBurst({ duration: 0.14, volume: 0.18, filter: 800 });
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

export function startBgm() {
  if (!audioState.bgmEnabled || bgmNodes) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx || !masterGain) {
    return;
  }
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.4);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1100;
  filter.Q.value = 0.6;
  filter.connect(gain);
  gain.connect(masterGain);
  const oscillators: OscillatorNode[] = [];
  const chord = [110, 164.81, 220, 277.18];
  chord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = idx % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 8;
    osc.connect(filter);
    osc.start();
    oscillators.push(osc);
  });
  bgmNodes = { oscillators, gain };
}

export function stopBgm() {
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
