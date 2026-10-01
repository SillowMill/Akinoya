// Sound effects for Äkinoya portal authentication feedback

class PortalEffectsAudio {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  // Play celestial chime on successful code entry
  public playUnlockChime() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const chimeGain = this.ctx.createGain();
      chimeGain.connect(this.ctx.destination);

      const freqs = [369.99, 466.16, 554.37, 698.46, 880];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        noteGain.gain.setValueAtTime(0.001, now + idx * 0.12);
        noteGain.gain.linearRampToValueAtTime(0.15, now + idx * 0.12 + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 2.2);

        osc.connect(noteGain);
        noteGain.connect(chimeGain);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 2.3);
      });
    } catch {
      // Audio fallback
    }
  }

  // Play single tone helper
  public playTone(freq: number = 880, duration: number = 0.1) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // Audio fallback
    }
  }

  // Play access deny tone on invalid attempt
  public playDenyTone() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // Audio fallback
    }
  }

  public playError() {
    this.playDenyTone();
  }
}

export const soundManager = new PortalEffectsAudio();
