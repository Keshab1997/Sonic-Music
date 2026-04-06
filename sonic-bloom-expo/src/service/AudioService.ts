import { Audio } from 'expo-av';
import { Track } from '../data/playlist';

export type AudioQuality = '96kbps' | '160kbps' | '320kbps';

interface AudioStatus {
  isPlaying: boolean;
  position: number;
  duration: number;
}

export class AudioService {
  private sound: Audio.Sound | null = null;
  private statusCallback: ((status: AudioStatus) => void) | null = null;
  private finishCallback: (() => void) | null = null;

  async initialize() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  async load(uri: string, volume: number = 1.0, rate: number = 1.0) {
    await this.unload();
    
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { 
        shouldPlay: false, 
        volume, 
        rate,
        progressUpdateIntervalMillis: 500 
      },
      this.onPlaybackStatusUpdate.bind(this)
    );
    
    this.sound = sound;
  }

  private onPlaybackStatusUpdate(status: any) {
    if (!status.isLoaded) return;
    
    if (this.statusCallback) {
      this.statusCallback({
        isPlaying: status.isPlaying,
        position: status.positionMillis / 1000,
        duration: status.durationMillis ? status.durationMillis / 1000 : 0,
      });
    }
    
    if (status.didJustFinish && this.finishCallback) {
      this.finishCallback();
    }
  }

  async play() {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  async pause() {
    if (this.sound) {
      await this.sound.pauseAsync();
    }
  }

  async stop() {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.stopAsync();
          await this.sound.setPositionAsync(0);
        }
      } catch (e) {
        // Silently ignore - sound may already be stopped
      }
    }
  }

  async seek(position: number) {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.setPositionAsync(position * 1000);
        }
      } catch (e) {
        console.log('Error seeking:', e);
      }
    }
  }

  async setVolume(volume: number) {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.setVolumeAsync(volume);
        }
      } catch (e) {
        console.log('Error setting volume:', e);
      }
    }
  }

  async setRate(rate: number) {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.setRateAsync(rate, true);
        }
      } catch (e) {
        console.log('Error setting rate:', e);
      }
    }
  }

  async unload() {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.unloadAsync();
        }
      } catch (e) {
        // Silently ignore - sound may already be unloaded
      } finally {
        this.sound = null;
      }
    }
  }

  setStatusCallback(callback: (status: AudioStatus) => void) {
    this.statusCallback = callback;
  }

  setFinishCallback(callback: () => void) {
    this.finishCallback = callback;
  }

  getAudioUrl(track: Track, quality: AudioQuality): string {
    if (track.audioUrls) {
      return track.audioUrls[quality] || 
             track.audioUrls['160kbps'] || 
             track.audioUrls['96kbps'] || 
             track.audioUrls['320kbps'] || 
             track.src;
    }
    return track.src;
  }
}

export const audioService = new AudioService();
