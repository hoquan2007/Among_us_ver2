let context: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = localStorage.getItem('starship-music') !== 'off';

export function musicEnabled(): boolean { return enabled; }

export function setMusicEnabled(value: boolean): void {
  enabled = value;
  localStorage.setItem('starship-music', value ? 'on' : 'off');
  if (value) unlockMusic();
  else setMusicActive(false);
}

export function unlockMusic(): void {
  if (!enabled || typeof AudioContext === 'undefined') return;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 850;
      filter.connect(master);
      for (const [frequency, volume] of [[110, .22], [164.81, .11], [220, .08], [329.63, .035]]) {
        const oscillator = context.createOscillator();
        const voice = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        voice.gain.value = volume;
        oscillator.connect(voice); voice.connect(filter); oscillator.start();
      }
      const pulse = context.createOscillator();
      const depth = context.createGain();
      pulse.type = 'sine'; pulse.frequency.value = .12; depth.gain.value = 45;
      pulse.connect(depth); depth.connect(filter.frequency); pulse.start();
    }
    void context.resume();
  } catch { /* Audio is optional on unsupported devices. */ }
}

export function setMusicActive(active: boolean): void {
  if (!context || !master) return;
  master.gain.setTargetAtTime(enabled && active ? .08 : 0, context.currentTime, .7);
}
