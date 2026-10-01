// Soundtrack manager for Planet Äkinoya ("Sillow Mill - Bingäa")

class PlanetSoundtrackManager {
  private audio: HTMLAudioElement | null = null;
  private isPlayingState: boolean = false;
  private listeners: Set<(isPlaying: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Use static public path for reliable streaming
      this.audio = new Audio('/audio/bws.wav');
      this.audio.loop = true;
      this.audio.volume = 0.65;

      this.audio.addEventListener('play', () => this.updateState(true));
      this.audio.addEventListener('pause', () => this.updateState(false));
      this.audio.addEventListener('ended', () => this.updateState(false));
    }
  }

  private updateState(playing: boolean) {
    this.isPlayingState = playing;
    this.listeners.forEach((listener) => listener(playing));
  }

  public subscribe(listener: (isPlaying: boolean) => void) {
    this.listeners.add(listener);
    listener(this.isPlayingState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public get isPlaying(): boolean {
    return this.isPlayingState;
  }

  public async play(): Promise<boolean> {
    if (!this.audio) return false;
    try {
      await this.audio.play();
      return true;
    } catch (err) {
      console.warn('Audio playback failed or was blocked by browser:', err);
      return false;
    }
  }

  public pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  public async togglePlay(): Promise<boolean> {
    if (!this.audio) return false;

    if (this.isPlayingState) {
      this.pause();
      return false;
    } else {
      return await this.play();
    }
  }

  public setVolume(vol: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, vol));
    }
  }
}

export const planetSoundtrack = new PlanetSoundtrackManager();
