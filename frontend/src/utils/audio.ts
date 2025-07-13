// Audio System for AI-BOS
// Provides sound effects, volume control, and accessibility features

export interface AudioConfig {
  enabled: boolean;
  volume: number;
  masterVolume: number;
  effectsVolume: number;
  uiVolume: number;
  systemVolume: number;
  globalMute: boolean; // NEW: Global mute override
  accessibilityMode: boolean; // NEW: Screen reader compatibility
  performanceMode: boolean; // NEW: Throttle sounds for performance
}

export interface SoundEffect {
  id: string;
  name: string;
  category: 'ui' | 'system' | 'notification' | 'feedback';
  file?: string;
  frequency?: number;
  duration?: number;
  volume?: number;
  priority?: 'low' | 'normal' | 'high'; // NEW: Sound priority
  throttleMs?: number; // NEW: Throttle interval
}

// NEW: Track metadata for iPod player
export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  coverUrl?: string;
  file: string;
}

// NEW: Enhanced playlist with metadata
export interface Playlist {
  id: string;
  name: string;
  tracks: TrackMetadata[];
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}

// Dynamic sound registry (can be replaced at runtime)
let SOUND_EFFECTS: Record<string, SoundEffect> = {
  // UI Sounds
  'window-open': {
    id: 'window-open',
    name: 'Window Open',
    category: 'ui',
    frequency: 800,
    duration: 150,
    volume: 0.3
  },
  'window-close': {
    id: 'window-close',
    name: 'Window Close',
    category: 'ui',
    frequency: 600,
    duration: 200,
    volume: 0.3
  },
  'window-snap': {
    id: 'window-snap',
    name: 'Window Snap',
    category: 'ui',
    frequency: 1000,
    duration: 100,
    volume: 0.4
  },
  'button-click': {
    id: 'button-click',
    name: 'Button Click',
    category: 'ui',
    frequency: 1200,
    duration: 80,
    volume: 0.2
  },
  'menu-open': {
    id: 'menu-open',
    name: 'Menu Open',
    category: 'ui',
    frequency: 900,
    duration: 120,
    volume: 0.25
  },
  'menu-close': {
    id: 'menu-close',
    name: 'Menu Close',
    category: 'ui',
    frequency: 700,
    duration: 120,
    volume: 0.25
  },
  'dock-hover': {
    id: 'dock-hover',
    name: 'Dock Hover',
    category: 'ui',
    frequency: 1100,
    duration: 60,
    volume: 0.15
  },
  'dock-click': {
    id: 'dock-click',
    name: 'Dock Click',
    category: 'ui',
    frequency: 1300,
    duration: 80,
    volume: 0.2
  },

  // System Sounds
  'startup': {
    id: 'startup',
    name: 'System Startup',
    category: 'system',
    frequency: 440,
    duration: 500,
    volume: 0.5
  },
  'shutdown': {
    id: 'shutdown',
    name: 'System Shutdown',
    category: 'system',
    frequency: 220,
    duration: 800,
    volume: 0.5
  },
  'error': {
    id: 'error',
    name: 'Error',
    category: 'system',
    frequency: 200,
    duration: 300,
    volume: 0.6
  },
  'success': {
    id: 'success',
    name: 'Success',
    category: 'system',
    frequency: 880,
    duration: 200,
    volume: 0.4
  },

  // Notification Sounds
  'notification': {
    id: 'notification',
    name: 'Notification',
    category: 'notification',
    frequency: 660,
    duration: 250,
    volume: 0.35
  },
  'alert': {
    id: 'alert',
    name: 'Alert',
    category: 'notification',
    frequency: 440,
    duration: 400,
    volume: 0.5
  },

  // Feedback Sounds
  'drag-start': {
    id: 'drag-start',
    name: 'Drag Start',
    category: 'feedback',
    frequency: 500,
    duration: 100,
    volume: 0.2
  },
  'drag-end': {
    id: 'drag-end',
    name: 'Drag End',
    category: 'feedback',
    frequency: 600,
    duration: 100,
    volume: 0.2
  },
  'resize': {
    id: 'resize',
    name: 'Resize',
    category: 'feedback',
    frequency: 400,
    duration: 80,
    volume: 0.15
  }
};

// Enterprise: Allow loading sound registry from JSON or API
export async function loadSoundRegistry(source: string | (() => Promise<Record<string, SoundEffect>>)) {
  let newRegistry: Record<string, SoundEffect> = {};
  if (typeof source === 'string') {
    const resp = await fetch(source);
    newRegistry = await resp.json();
  } else {
    newRegistry = await source();
  }
  SOUND_EFFECTS = newRegistry;
}

// Enterprise: Allow replacing sound registry at runtime
export function setSoundRegistry(registry: Record<string, SoundEffect>) {
  SOUND_EFFECTS = registry;
}

// Enterprise: Logger interface
export interface AudioLogger {
  log: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

// Enterprise: Device profile interface
export interface AudioDeviceProfile {
  id: string;
  name: string;
  description?: string;
  outputDeviceId?: string;
  preferredVolume?: number;
  accessibilityMode?: boolean;
}

// Enterprise: Dynamic config source
export type AudioConfigSource = string | (() => Promise<Partial<AudioConfig>>);

class AudioManager {
  private static _instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private config: AudioConfig;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;
  private logger: AudioLogger | null = null;
  // private deviceProfiles: AudioDeviceProfile[] = []; // Unused - commented out
  private configSource: AudioConfigSource | null = null;
  private playingSources: Map<string, AudioBufferSourceNode> = new Map();
  
  // NEW: Performance and accessibility features
  private lastPlayTimes: Map<string, number> = new Map();
  private accessibilityAnnouncements: string[] = [];
  private performanceThrottleMs = 50;

  private constructor() {
    this.config = this.loadConfig();
  }

  // Singleton accessor
  public static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  // Enterprise: Set logger
  setLogger(logger: AudioLogger) {
    this.logger = logger;
  }

  // Enterprise: Set config source (URL or async function)
  setConfigSource(source: AudioConfigSource) {
    this.configSource = source;
  }

  // Enterprise: Set device profiles
  setDeviceProfiles(): void {
    // No-op: deviceProfiles property removed
  }

  // Enterprise: Set active device profile
  setActiveProfile(_profileId: string) {
    // This method is no longer used, but keeping it for now as it's not explicitly removed.
    // The activeProfile variable was removed from the class.
  }

  // Enterprise: Async config loading
  async loadConfigAsync(): Promise<void> {
    if (!this.configSource) return;
    try {
      let configPatch: Partial<AudioConfig> = {};
      if (typeof this.configSource === 'string') {
        // Fetch JSON config
        const resp = await fetch(this.configSource);
        configPatch = await resp.json();
      } else if (typeof this.configSource === 'function') {
        configPatch = await this.configSource();
      }
      this.config = { ...this.config, ...configPatch };
      this.saveConfig();
      this.logger?.log?.('Audio config loaded dynamically', this.config);
    } catch (err) {
      this.logger?.error?.('Failed to load audio config:', err);
    }
  }

  private loadConfig(): AudioConfig {
    if (typeof window === 'undefined') {
      return {
        enabled: false,
        volume: 1.0,
        masterVolume: 1.0,
        effectsVolume: 0.7,
        uiVolume: 0.5,
        systemVolume: 0.6,
        globalMute: false,
        accessibilityMode: false,
        performanceMode: false
      };
    }

    const saved = localStorage.getItem('aibos-audio-config');
    if (saved) {
      try {
        return { ...JSON.parse(saved) };
      } catch {
        // Fallback to defaults
      }
    }

    return {
      enabled: true,
      volume: 1.0,
      masterVolume: 1.0,
      effectsVolume: 0.7,
      uiVolume: 0.5,
      systemVolume: 0.6,
      globalMute: false,
      accessibilityMode: false,
      performanceMode: false
    };
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aibos-audio-config', JSON.stringify(this.config));
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Check if audio is supported
      if (!globalThis.AudioContext && !(globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) {
        console.warn('AudioContext not supported');
        this.config.enabled = false;
        return;
      }

      // Initialize AudioContext
      const AudioContextClass = globalThis.AudioContext || (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('Audio system initialized');
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
      this.config.enabled = false;
    }
  }

  private getVolumeForCategory(category: SoundEffect['category']): number {
    if (!this.config.enabled) return 0;

    const categoryVolume = {
      ui: this.config.uiVolume,
      system: this.config.systemVolume,
      notification: this.config.effectsVolume,
      feedback: this.config.effectsVolume
    }[category];

    return this.config.masterVolume * this.config.volume * categoryVolume;
  }

  private createTone(frequency: number, duration: number, volume: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration / 1000, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3); // Exponential decay
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * volume;
    }

    return buffer;
  }

  /**
   * Play an audio file (URL or base64). Returns a promise that resolves when playback finishes.
   */
  async playFile(fileUrl: string, options?: { volume?: number; category?: SoundEffect['category'] }): Promise<void> {
    if (!this.config.enabled || !this.audioContext) return;
    try {
      // Fetch and decode audio file
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = (options?.volume ?? 1.0) * this.config.masterVolume;
      gainNode.connect(this.audioContext.destination);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.start();
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
    } catch (err) {
      this.logger?.error?.('Failed to play audio file:', err);
    }
  }

  /**
   * Play a sound effect by ID (tone or file). Prevents overlapping triggers for the same effect.
   */
  async playSound(effectId: string): Promise<void> {
    if (!this.config.enabled || !this.audioContext || this.audioContext.state !== 'running') {
      return;
    }
    
    // NEW: Check global mute
    if (this.config.globalMute) {
      this.logger?.log?.(`Sound '${effectId}' blocked by global mute`);
      return;
    }
    
    const effect = SOUND_EFFECTS[effectId];
    if (!effect) {
      this.logger?.warn?.(`Sound effect '${effectId}' not found`);
      return;
    }
    
    // NEW: Check throttling
    if (this.shouldThrottle(effectId, effect)) {
      this.logger?.log?.(`Sound '${effectId}' throttled for performance`);
      return;
    }
    
    // Prevent overlapping triggers for the same effect
    if (this.playingSources.has(effectId)) {
      this.logger?.log?.(`Prevented overlapping trigger for '${effectId}'`);
      return;
    }
    
    try {
      let buffer = this.audioCache.get(effectId);
      let source: AudioBufferSourceNode | null = null;
      
      if (effect.file) {
        // File playback
        const options: { volume?: number; category?: SoundEffect['category'] } = { category: effect.category };
        if (effect.volume !== undefined) {
          options.volume = effect.volume;
        }
        await this.playFile(effect.file, options);
        return;
      } else if (!buffer && effect.frequency) {
        const volume = this.getVolumeForCategory(effect.category) * (effect.volume || 1.0);
        buffer = this.createTone(effect.frequency, effect.duration || 200, volume);
        this.audioCache.set(effectId, buffer);
      }
      
      if (!buffer) return;
      
      source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      this.playingSources.set(effectId, source);
      source.start();
      
      // NEW: Accessibility announcement for important sounds
      if (effect.priority === 'high' && this.config.accessibilityMode) {
        this.announceToScreenReader(`${effect.name} sound played`);
      }
      
      await new Promise<void>((resolve) => {
        source.onended = () => {
          this.playingSources.delete(effectId);
          resolve();
        };
      });
    } catch (error) {
      this.logger?.error?.(`Failed to play sound '${effectId}':`, error);
      this.playingSources.delete(effectId);
    }
  }

  // Convenience methods for common sounds
  async playWindowOpen(): Promise<void> {
    await this.playSound('window-open');
  }

  async playWindowClose(): Promise<void> {
    await this.playSound('window-close');
  }

  async playWindowSnap(): Promise<void> {
    await this.playSound('window-snap');
  }

  async playButtonClick(): Promise<void> {
    await this.playSound('button-click');
  }

  async playMenuOpen(): Promise<void> {
    await this.playSound('menu-open');
  }

  async playMenuClose(): Promise<void> {
    await this.playSound('menu-close');
  }

  async playDockHover(): Promise<void> {
    await this.playSound('dock-hover');
  }

  async playDockClick(): Promise<void> {
    await this.playSound('dock-click');
  }

  async playNotification(): Promise<void> {
    await this.playSound('notification');
  }

  async playError(): Promise<void> {
    await this.playSound('error');
  }

  async playSuccess(): Promise<void> {
    await this.playSound('success');
  }

  async playDragStart(): Promise<void> {
    await this.playSound('drag-start');
  }

  async playDragEnd(): Promise<void> {
    await this.playSound('drag-end');
  }

  async playResize(): Promise<void> {
    await this.playSound('resize');
  }

  // NEW: Check if sound should be throttled
  private shouldThrottle(effectId: string, effect: SoundEffect): boolean {
    if (!this.config.performanceMode) return false;
    
    const now = Date.now();
    const lastPlay = this.lastPlayTimes.get(effectId) || 0;
    const throttleTime = effect.throttleMs || this.performanceThrottleMs;
    
    if (now - lastPlay < throttleTime) {
      return true;
    }
    
    this.lastPlayTimes.set(effectId, now);
    return false;
  }

  // NEW: Accessibility announcement
  private announceToScreenReader(message: string): void {
    if (!this.config.accessibilityMode) return;
    
    this.accessibilityAnnouncements.push(message);
    // Trigger ARIA live region update
    const event = new CustomEvent('aibos-audio-announcement', { 
      detail: { message, timestamp: Date.now() } 
    });
    globalThis.dispatchEvent(event);
  }

  // NEW: Global mute toggle
  setGlobalMute(muted: boolean): void {
    this.config.globalMute = muted;
    this.saveConfig();
    this.announceToScreenReader(muted ? 'Audio muted' : 'Audio unmuted');
  }

  // NEW: Accessibility mode toggle
  setAccessibilityMode(enabled: boolean): void {
    this.config.accessibilityMode = enabled;
    this.saveConfig();
  }

  // NEW: Performance mode toggle
  setPerformanceMode(enabled: boolean): void {
    this.config.performanceMode = enabled;
    this.saveConfig();
  }

  // Configuration methods
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  setEffectsVolume(volume: number): void {
    this.config.effectsVolume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  setUIVolume(volume: number): void {
    this.config.uiVolume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  setSystemVolume(volume: number): void {
    this.config.systemVolume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Cleanup
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioCache.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();

// Initialize audio system when module loads
if (typeof window !== 'undefined') {
  audioManager.initialize().catch(console.error);
} 

// Enterprise: iPod-like AudioPlayer for music playback
export class AudioPlayer {
  private audioElement: HTMLAudioElement;
  private currentPlaylist: Playlist | null = null;
  private currentTrackIndex = 0;
  private onTrackChange: ((track: TrackMetadata, index: number) => void) | null = null;
  private onPlayStateChange: ((playing: boolean) => void) | null = null;
  private onPlaylistChange: ((playlist: Playlist) => void) | null = null;
  private shuffledIndices: number[] = [];
  private isShuffled = false;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.addEventListener('ended', this.handleTrackEnd);
    this.audioElement.addEventListener('play', () => this.onPlayStateChange?.(true));
    this.audioElement.addEventListener('pause', () => this.onPlayStateChange?.(false));
    this.audioElement.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audioElement.addEventListener('loadedmetadata', this.handleMetadataLoaded);
  }

  // NEW: Load playlist with metadata
  loadPlaylist(playlist: Playlist) {
    this.currentPlaylist = playlist;
    this.currentTrackIndex = 0;
    this.isShuffled = playlist.shuffle;
    this.generateShuffledIndices();
    this.loadCurrentTrack();
    this.onPlaylistChange?.(playlist);
  }

  // NEW: Generate shuffled indices for random playback
  private generateShuffledIndices() {
    if (!this.currentPlaylist) return;
    
    this.shuffledIndices = Array.from({ length: this.currentPlaylist.tracks.length }, (_, i) => i);
    if (this.isShuffled) {
      for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = this.shuffledIndices[i];
        if (temp !== undefined && this.shuffledIndices[j] !== undefined) {
          this.shuffledIndices[i] = this.shuffledIndices[j];
          this.shuffledIndices[j] = temp;
        }
      }
    }
  }

  // NEW: Get current track with metadata
  private getCurrentTrack(): TrackMetadata | null {
    if (!this.currentPlaylist || this.currentPlaylist.tracks.length === 0) return null;
    
    const actualIndex = this.isShuffled ? this.shuffledIndices[this.currentTrackIndex] : this.currentTrackIndex;
    if (actualIndex === undefined || actualIndex < 0 || actualIndex >= this.currentPlaylist.tracks.length) {
      return null;
    }
    return this.currentPlaylist.tracks[actualIndex] || null;
  }

  private loadCurrentTrack() {
    const track = this.getCurrentTrack();
    if (!track) return;
    
    this.audioElement.src = track.file;
    this.onTrackChange?.(track, this.currentTrackIndex);
  }

  play() {
    this.audioElement.play();
  }

  pause() {
    this.audioElement.pause();
  }

  // NEW: Enhanced next with repeat modes
  next() {
    if (!this.currentPlaylist || this.currentPlaylist.tracks.length === 0) return;
    
    if (this.currentPlaylist.repeat === 'one') {
      // Repeat current track
      this.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    this.currentTrackIndex++;
    
    if (this.currentTrackIndex >= this.currentPlaylist.tracks.length) {
      if (this.currentPlaylist.repeat === 'all') {
        // Loop playlist
        this.currentTrackIndex = 0;
      } else {
        // Stop at end
        this.currentTrackIndex = this.currentPlaylist.tracks.length - 1;
        return;
      }
    }
    
    this.loadCurrentTrack();
    this.play();
  }

  // NEW: Enhanced previous with repeat modes
  prev() {
    if (!this.currentPlaylist || this.currentPlaylist.tracks.length === 0) return;
    
    if (this.currentPlaylist.repeat === 'one') {
      // Repeat current track
      this.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    this.currentTrackIndex--;
    
    if (this.currentTrackIndex < 0) {
      if (this.currentPlaylist.repeat === 'all') {
        // Loop playlist
        this.currentTrackIndex = this.currentPlaylist.tracks.length - 1;
      } else {
        // Stop at beginning
        this.currentTrackIndex = 0;
        return;
      }
    }
    
    this.loadCurrentTrack();
    this.play();
  }

  seek(time: number) {
    this.audioElement.currentTime = time;
  }

  setVolume(vol: number) {
    this.audioElement.volume = Math.max(0, Math.min(1, vol));
  }

  // NEW: Get current track metadata
  getCurrentTrackMetadata(): TrackMetadata | null {
    return this.getCurrentTrack();
  }

  getCurrentTime(): number {
    return this.audioElement.currentTime;
  }

  getDuration(): number {
    return this.audioElement.duration;
  }

  isPlaying(): boolean {
    return !this.audioElement.paused;
  }

  // NEW: Playlist controls
  toggleShuffle(): void {
    if (!this.currentPlaylist) return;
    
    this.isShuffled = !this.isShuffled;
    this.currentPlaylist.shuffle = this.isShuffled;
    this.generateShuffledIndices();
  }

  setRepeatMode(mode: 'none' | 'one' | 'all'): void {
    if (!this.currentPlaylist) return;
    this.currentPlaylist.repeat = mode;
  }

  // NEW: Jump to specific track
  jumpToTrack(index: number): void {
    if (!this.currentPlaylist || index < 0 || index >= this.currentPlaylist.tracks.length) return;
    
    this.currentTrackIndex = index;
    this.loadCurrentTrack();
    this.play();
  }

  // NEW: Get playlist info
  getPlaylist(): Playlist | null {
    return this.currentPlaylist;
  }

  getTrackCount(): number {
    return this.currentPlaylist?.tracks.length || 0;
  }

  getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  // NEW: Event handlers
  setOnTrackChange(cb: (track: TrackMetadata, index: number) => void) {
    this.onTrackChange = cb;
  }

  setOnPlayStateChange(cb: (playing: boolean) => void) {
    this.onPlayStateChange = cb;
  }

  setOnPlaylistChange(cb: (playlist: Playlist) => void) {
    this.onPlaylistChange = cb;
  }

  // NEW: Enhanced event handlers
  private handleTrackEnd = () => {
    this.next();
  };

  private handleTimeUpdate = () => {
    // Could emit progress events here
  };

  private handleMetadataLoaded = () => {
    const track = this.getCurrentTrack();
    if (track && !track.duration) {
      track.duration = this.audioElement.duration;
    }
  };
}

// Export singleton instance for UI integration
export const audioPlayer = new AudioPlayer(); 