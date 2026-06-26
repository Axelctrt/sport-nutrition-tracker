interface AudioContextConstructor {
  new (): AudioContext;
}

let sharedAudioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') return sharedAudioContext;

  const audioWindow = window as typeof window & { webkitAudioContext?: AudioContextConstructor };
  const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) return undefined;

  try {
    sharedAudioContext = new AudioContextClass();
    return sharedAudioContext;
  } catch {
    return undefined;
  }
}

function startTone(context: AudioContext, volume: number, durationSeconds: number): boolean {
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    gain.gain.setValueAtTime(Math.max(volume, 0.0001), context.currentTime);
    if (volume > 0.0001) {
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSeconds);
    }
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationSeconds);
    return true;
  } catch {
    return false;
  }
}

export function vibrateForRestTimer(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate([180, 100, 180]);
  } catch {
    return false;
  }
}

/**
 * À appeler directement depuis une interaction utilisateur. Safari iOS bloque
 * sinon l'AudioContext créé seulement à l'échéance du minuteur.
 */
export function prepareRestTimerSound(): boolean {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
    // Son pratiquement silencieux destiné uniquement à autoriser le contexte audio.
    return startTone(context, 0.0001, 0.01);
  } catch {
    return false;
  }
}

export function playRestTimerSound(): boolean {
  const context = getAudioContext();
  if (!context) return false;

  const play = () => startTone(context, 0.12, 0.24);
  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => undefined);
    return true;
  }
  return play();
}
