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

  // Play single tone helper (pleasant navigation/interaction chimes only)
  public playTone(freq: number = 880, duration: number = 0.1) {
    // Suppress low/dull error, buzzer, or rejection tones (< 400Hz)
    if (freq < 400) {
      return;
    }

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

  // Access deny tone - COMPLETELY MUTED across the portal to eliminate all jarring error/rejection sounds
  public playDenyTone() {
    // Intentionally silent: zero error buzzers or harsh feedback
  }

  // Error tone - COMPLETELY MUTED across the portal
  public playError() {
    // Intentionally silent: zero error audio feedback
  }

  // Play smooth sci-fi frequency sweep (dual-tone acoustic feedback)
  public playAcousticSweep(fromFreq: number = 540, toFreq: number = 780, duration: number = 0.14) {
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
      osc.frequency.setValueAtTime(Math.max(20, fromFreq), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), now + duration);

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
}

export const soundManager = new PortalEffectsAudio();
