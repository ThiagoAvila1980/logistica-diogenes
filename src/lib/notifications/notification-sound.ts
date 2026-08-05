/**
 * Som discreto para notificações novas.
 *
 * No PWA mobile (esp. iOS), Web Audio sozinho falha com frequência:
 * usamos HTMLAudioElement com WAV gerado + "prime" no primeiro toque.
 */

type AudioContextConstructor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;
let unlockBound = false;
let audioUnlocked = false;
let chimeAudio: HTMLAudioElement | null = null;
let chimeUrl: string | null = null;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getSharedContext(): AudioContext | null {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return null;
  if (!sharedCtx) {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** Gera um ding suave (~0,35s) em WAV PCM — sem arquivo estático. */
function buildSoftChimeWav(): Blob {
  const sampleRate = 22050;
  const durationSec = 0.36;
  const numSamples = Math.floor(sampleRate * durationSec);
  const data = new Float32Array(numSamples);

  const tones = [
    { freq: 587.33, start: 0, len: 0.16, peak: 0.32 },
    { freq: 880, start: 0.11, len: 0.22, peak: 0.26 },
  ] as const;

  for (const tone of tones) {
    const start = Math.floor(tone.start * sampleRate);
    const len = Math.floor(tone.len * sampleRate);
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      const env = Math.sin(Math.PI * Math.min(1, i / (len * 0.15))) *
        Math.exp(-3.2 * t);
      data[idx]! += Math.sin(2 * Math.PI * tone.freq * t) * tone.peak * env;
    }
  }

  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + numSamples * bytesPerSample);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * bytesPerSample, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]!));
    view.setInt16(offset, Math.round(sample * 0x7fff), true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function ensureChimeAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (chimeAudio) return chimeAudio;

  try {
    const blob = buildSoftChimeWav();
    chimeUrl = URL.createObjectURL(blob);
    chimeAudio = new Audio(chimeUrl);
    chimeAudio.preload = "auto";
    chimeAudio.volume = 0.45;
    // iOS: playsInline ajuda em alguns webviews/PWA
    chimeAudio.setAttribute("playsinline", "true");
    chimeAudio.setAttribute("webkit-playsinline", "true");
    return chimeAudio;
  } catch {
    return null;
  }
}

async function resumeAudioContext(): Promise<void> {
  const ctx = getSharedContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

/**
 * "Prime" do áudio no gesto do usuário — obrigatório no iOS/PWA.
 * Continua tentando até conseguir (toques seguintes).
 */
async function primeAudioFromGesture(): Promise<void> {
  await resumeAudioContext();

  const audio = ensureChimeAudio();
  if (!audio) return;

  try {
    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 0.45;
    audioUnlocked = true;
  } catch {
    // Ainda sem gesto válido — tentamos de novo no próximo toque.
  }
}

/** Libera áudio para PWA/mobile; reativa ao voltar para o app. */
export function unlockNotificationSound(): void {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;

  ensureChimeAudio();

  const onGesture = () => {
    void primeAudioFromGesture().then(() => {
      if (!audioUnlocked) return;
      window.removeEventListener("touchstart", onGesture, true);
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("click", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    });
  };

  // capture + touchstart: mais confiável no iOS do que só pointerdown
  window.addEventListener("touchstart", onGesture, {
    capture: true,
    passive: true,
  });
  window.addEventListener("pointerdown", onGesture, {
    capture: true,
    passive: true,
  });
  window.addEventListener("click", onGesture, true);
  window.addEventListener("keydown", onGesture, true);

  const onForeground = () => {
    if (document.visibilityState !== "visible") return;
    void resumeAudioContext();
    // Se ainda não desbloqueou, o próximo toque tenta de novo (listeners ativos).
  };

  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("pageshow", onForeground);
  window.addEventListener("focus", onForeground);
}

export function shouldPlayNotificationSound(
  previousUnread: number | null,
  nextUnread: number,
  isVisible: boolean,
): boolean {
  if (!isVisible) return false;
  if (previousUnread === null) return false;
  return nextUnread > previousUnread;
}

function scheduleTone(
  ctx: AudioContext,
  {
    frequency,
    startAt,
    duration,
    peakGain,
  }: {
    frequency: number;
    startAt: number;
    duration: number;
    peakGain: number;
  },
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playViaWebAudio(): void {
  const ctx = getSharedContext();
  if (!ctx || ctx.state !== "running") return;

  const t0 = ctx.currentTime + 0.01;
  scheduleTone(ctx, {
    frequency: 587.33,
    startAt: t0,
    duration: 0.16,
    peakGain: 0.12,
  });
  scheduleTone(ctx, {
    frequency: 880,
    startAt: t0 + 0.12,
    duration: 0.22,
    peakGain: 0.1,
  });
}

/** Toca o ding — prioriza HTMLAudio (PWA/iOS), Web Audio como reforço. */
export function playNotificationChime(): void {
  try {
    void (async () => {
      await resumeAudioContext();

      const audio = ensureChimeAudio();
      if (audio) {
        try {
          audio.muted = false;
          audio.volume = 0.45;
          audio.currentTime = 0;
          await audio.play();
          audioUnlocked = true;
          return;
        } catch {
          // Cai no Web Audio se o elemento ainda estiver bloqueado.
        }
      }

      playViaWebAudio();
    })();
  } catch {
    // Falha silenciosa: áudio é opcional.
  }
}
