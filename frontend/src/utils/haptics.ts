// Haptic Feedback System for AI-BOS
// Provides vibration feedback for touch devices and accessibility

export interface HapticConfig {
  enabled: boolean;
  intensity: number;
  duration: number;
  pattern: number[];
}

export interface HapticPattern {
  id: string;
  name: string;
  category: 'ui' | 'system' | 'notification' | 'feedback';
  pattern: number[];
  intensity: number;
  duration: number;
}

// Default haptic patterns
export const HAPTIC_PATTERNS: Record<string, HapticPattern> = {
  // UI Patterns
  'button-press': {
    id: 'button-press',
    name: 'Button Press',
    category: 'ui',
    pattern: [50],
    intensity: 0.3,
    duration: 50
  },
  'button-release': {
    id: 'button-release',
    name: 'Button Release',
    category: 'ui',
    pattern: [30],
    intensity: 0.2,
    duration: 30
  },
  'window-snap': {
    id: 'window-snap',
    name: 'Window Snap',
    category: 'ui',
    pattern: [100, 50, 100],
    intensity: 0.5,
    duration: 250
  },
  'menu-open': {
    id: 'menu-open',
    name: 'Menu Open',
    category: 'ui',
    pattern: [80],
    intensity: 0.3,
    duration: 80
  },
  'menu-close': {
    id: 'menu-close',
    name: 'Menu Close',
    category: 'ui',
    pattern: [60],
    intensity: 0.3,
    duration: 60
  },
  'dock-hover': {
    id: 'dock-hover',
    name: 'Dock Hover',
    category: 'ui',
    pattern: [40],
    intensity: 0.2,
    duration: 40
  },
  'dock-click': {
    id: 'dock-click',
    name: 'Dock Click',
    category: 'ui',
    pattern: [70],
    intensity: 0.4,
    duration: 70
  },

  // System Patterns
  'startup': {
    id: 'startup',
    name: 'System Startup',
    category: 'system',
    pattern: [200, 100, 200],
    intensity: 0.6,
    duration: 500
  },
  'shutdown': {
    id: 'shutdown',
    name: 'System Shutdown',
    category: 'system',
    pattern: [300, 150, 300],
    intensity: 0.6,
    duration: 750
  },
  'error': {
    id: 'error',
    name: 'Error',
    category: 'system',
    pattern: [100, 50, 100, 50, 100],
    intensity: 0.7,
    duration: 400
  },
  'success': {
    id: 'success',
    name: 'Success',
    category: 'system',
    pattern: [150, 100, 150],
    intensity: 0.5,
    duration: 400
  },

  // Notification Patterns
  'notification': {
    id: 'notification',
    name: 'Notification',
    category: 'notification',
    pattern: [120, 80, 120],
    intensity: 0.4,
    duration: 320
  },
  'alert': {
    id: 'alert',
    name: 'Alert',
    category: 'notification',
    pattern: [200, 100, 200, 100, 200],
    intensity: 0.6,
    duration: 800
  },

  // Feedback Patterns
  'drag-start': {
    id: 'drag-start',
    name: 'Drag Start',
    category: 'feedback',
    pattern: [80],
    intensity: 0.3,
    duration: 80
  },
  'drag-end': {
    id: 'drag-end',
    name: 'Drag End',
    category: 'feedback',
    pattern: [100],
    intensity: 0.4,
    duration: 100
  },
  'resize': {
    id: 'resize',
    name: 'Resize',
    category: 'feedback',
    pattern: [60],
    intensity: 0.2,
    duration: 60
  },
  'scroll': {
    id: 'scroll',
    name: 'Scroll',
    category: 'feedback',
    pattern: [30],
    intensity: 0.1,
    duration: 30
  }
};

// Enterprise: Logger interface
export interface HapticLogger {
  log: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

// Enterprise: Device profile interface
export interface HapticDeviceProfile {
  id: string;
  name: string;
  description?: string;
  preferredIntensity?: number;
  accessibilityMode?: boolean;
}

// Enterprise: Dynamic config source
export type HapticConfigSource = string | (() => Promise<Partial<HapticConfig>>);

class HapticManager {
  private static _instance: HapticManager | null = null;
  private config: HapticConfig;
  private isSupported: boolean;
  private isInitialized = false;
  private logger: HapticLogger | null = null;
  private deviceProfiles: HapticDeviceProfile[] = [];
  private configSource: HapticConfigSource | null = null;
  
  // NEW: Performance and accessibility features
  private isVibrating = false;
  private lastVibrationTime = 0;
  private vibrationThrottleMs = 50;
  private accessibilityMode = false;

  private constructor() {
    this.config = this.loadConfig();
    this.isSupported = this.checkSupport();
    this.checkAccessibilityMode();
  }

  // NEW: Check for accessibility preferences
  private checkAccessibilityMode(): void {
    if (typeof window !== 'undefined') {
      this.accessibilityMode = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Listen for changes
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.accessibilityMode = e.matches;
        this.logger?.log?.('Accessibility mode changed:', this.accessibilityMode);
      });
    }
  }

  // NEW: Check if vibration should be throttled
  private shouldThrottle(): boolean {
    const now = Date.now();
    if (now - this.lastVibrationTime < this.vibrationThrottleMs) {
      return true;
    }
    this.lastVibrationTime = now;
    return false;
  }

  // NEW: Get accessibility mode status
  isAccessibilityMode(): boolean {
    return this.accessibilityMode;
  }

  // NEW: Set accessibility mode manually
  setAccessibilityMode(enabled: boolean): void {
    this.accessibilityMode = enabled;
    this.logger?.log?.('Accessibility mode set manually:', enabled);
  }

  // Singleton accessor
  public static getInstance(): HapticManager {
    if (!HapticManager._instance) {
      HapticManager._instance = new HapticManager();
    }
    return HapticManager._instance;
  }

  // Enterprise: Set logger
  setLogger(logger: HapticLogger) {
    this.logger = logger;
  }

  // Enterprise: Set config source (URL or async function)
  setConfigSource(source: HapticConfigSource) {
    this.configSource = source;
  }

  // Enterprise: Set device profiles
  setDeviceProfiles(profiles: HapticDeviceProfile[]) {
    this.deviceProfiles = profiles;
  }

  // Enterprise: Set active device profile
  setActiveProfile(_profileId: string) {
    // This method is no longer needed as activeProfile is removed.
    // Keeping it here for now, but it will be removed in a subsequent edit.
    // this.activeProfile = this.deviceProfiles.find(p => p.id === profileId) || null;
  }

  // Enterprise: Async config loading
  async loadConfigAsync(): Promise<void> {
    if (!this.configSource) return;
    try {
      let configPatch: Partial<HapticConfig> = {};
      if (typeof this.configSource === 'string') {
        // Fetch JSON config
        const resp = await fetch(this.configSource);
        configPatch = await resp.json();
      } else if (typeof this.configSource === 'function') {
        configPatch = await this.configSource();
      }
      this.config = { ...this.config, ...configPatch };
      this.saveConfig();
      this.logger?.log?.('Haptic config loaded dynamically', this.config);
    } catch (err) {
      this.logger?.error?.('Failed to load haptic config:', err);
    }
  }

  private loadConfig(): HapticConfig {
    if (typeof window === 'undefined') {
      return {
        enabled: false,
        intensity: 1.0,
        duration: 100,
        pattern: [100]
      };
    }

    const saved = localStorage.getItem('aibos-haptic-config');
    if (saved) {
      try {
        return { ...JSON.parse(saved) };
      } catch {
        // Fallback to defaults
      }
    }

    return {
      enabled: true,
      intensity: 1.0,
      duration: 100,
      pattern: [100]
    };
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aibos-haptic-config', JSON.stringify(this.config));
    }
  }

  private checkSupport(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for Vibration API support
    if ('vibrate' in navigator) {
      return true;
    }

    // Check for WebKit vibration support
    if ('vibrate' in (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean })) {
      return true;
    }

          // Check for experimental vibration support
      if ((navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate || (navigator as Navigator & { mozVibrate?: (pattern: number | number[]) => boolean }).mozVibrate) {
      return true;
    }

    return false;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test vibration support
      if (this.isSupported && this.config.enabled) {
        // Try a minimal vibration to test support
        await this.vibrate([10]);
        console.log('Haptic feedback system initialized');
      } else {
        console.log('Haptic feedback not supported or disabled');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize haptic system:', error);
      this.config.enabled = false;
    }
  }

  private vibrate(pattern: number[]): Promise<void> {
    if (!this.isSupported || !this.config.enabled) return Promise.resolve();

    // NEW: Check accessibility mode
    if (this.accessibilityMode) {
      this.logger?.log?.('Vibration blocked by accessibility mode');
      return Promise.resolve();
    }

    // NEW: Check for overlapping vibrations
    if (this.isVibrating) {
      this.logger?.log?.('Vibration blocked - already vibrating');
      return Promise.resolve();
    }

    // NEW: Check throttling
    if (this.shouldThrottle()) {
      this.logger?.log?.('Vibration throttled for performance');
      return Promise.resolve();
    }

    try {
      this.isVibrating = true;
      
      // Apply intensity scaling
      const scaledPattern = pattern.map(duration => 
        Math.round(duration * this.config.intensity)
      );

              // Use the appropriate vibration API
        if ('vibrate' in navigator) {
          (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(scaledPattern);
        } else if ((navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate) {
          (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(scaledPattern);
        } else if ((navigator as Navigator & { mozVibrate?: (pattern: number | number[]) => boolean }).mozVibrate) {
          (navigator as Navigator & { mozVibrate?: (pattern: number | number[]) => boolean }).mozVibrate?.(scaledPattern);
        }

      // NEW: Calculate total duration and resolve Promise when done
      const totalDuration = scaledPattern.reduce((acc, duration) => acc + duration, 0);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          this.isVibrating = false;
          resolve();
        }, totalDuration);
      });
    } catch (error) {
      this.isVibrating = false;
      this.logger?.error?.('Failed to vibrate:', error);
      throw error;
    }
  }

  async playHaptic(patternId: string): Promise<void> {
    if (!this.isSupported || !this.config.enabled) return;

    const pattern = HAPTIC_PATTERNS[patternId];
    if (!pattern) {
      console.warn(`Haptic pattern '${patternId}' not found`);
      return;
    }

    try {
      await this.vibrate(pattern.pattern);
    } catch (error) {
      console.error(`Failed to play haptic '${patternId}':`, error);
    }
  }

  // Convenience methods for common haptics
  async playButtonPress(): Promise<void> {
    await this.playHaptic('button-press');
  }

  async playButtonRelease(): Promise<void> {
    await this.playHaptic('button-release');
  }

  async playWindowSnap(): Promise<void> {
    await this.playHaptic('window-snap');
  }

  async playMenuOpen(): Promise<void> {
    await this.playHaptic('menu-open');
  }

  async playMenuClose(): Promise<void> {
    await this.playHaptic('menu-close');
  }

  async playDockHover(): Promise<void> {
    await this.playHaptic('dock-hover');
  }

  async playDockClick(): Promise<void> {
    await this.playHaptic('dock-click');
  }

  async playNotification(): Promise<void> {
    await this.playHaptic('notification');
  }

  async playError(): Promise<void> {
    await this.playHaptic('error');
  }

  async playSuccess(): Promise<void> {
    await this.playHaptic('success');
  }

  async playDragStart(): Promise<void> {
    await this.playHaptic('drag-start');
  }

  async playDragEnd(): Promise<void> {
    await this.playHaptic('drag-end');
  }

  async playResize(): Promise<void> {
    await this.playHaptic('resize');
  }

  async playScroll(): Promise<void> {
    await this.playHaptic('scroll');
  }

  // Custom vibration patterns
  async vibrateCustom(pattern: number[], intensity?: number): Promise<void> {
    if (!this.isSupported || !this.config.enabled) return;

    const effectiveIntensity = intensity || this.config.intensity;
    const scaledPattern = pattern.map(duration => 
      Math.round(duration * effectiveIntensity)
    );

    await this.vibrate(scaledPattern);
  }

  // NEW: Synchronized audio-haptic feedback
  async playWithAudio(audioId: string, hapticId: string): Promise<void> {
    try {
      // Import audioManager dynamically to avoid circular dependencies
      const { audioManager } = await import('./audio.ts');
      
      await Promise.all([
        audioManager.playSound(audioId),
        this.playHaptic(hapticId)
      ]);
    } catch (error) {
      this.logger?.error?.('Failed to play synchronized feedback:', error);
    }
  }

  // NEW: Enhanced button feedback with both audio and haptic
  async playButtonPressWithAudio(): Promise<void> {
    await this.playWithAudio('button-click', 'button-press');
  }

  async playButtonReleaseWithAudio(): Promise<void> {
    await this.playWithAudio('button-click', 'button-release');
  }

  async playNotificationWithAudio(): Promise<void> {
    await this.playWithAudio('notification', 'notification');
  }

  async playErrorWithAudio(): Promise<void> {
    await this.playWithAudio('error', 'error');
  }

  async playSuccessWithAudio(): Promise<void> {
    await this.playWithAudio('success', 'success');
  }

  // Configuration methods
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
    this.saveConfig();
  }

  setDuration(duration: number): void {
    this.config.duration = Math.max(10, Math.min(1000, duration));
    this.saveConfig();
  }

  getConfig(): HapticConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled && this.isSupported;
  }

  hasSupport(): boolean {
    return this.isSupported;
  }

  // Stop vibration
  stop(): void {
    if (this.isSupported) {
              try {
          if ('vibrate' in navigator) {
            (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(0);
          } else if ((navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate) {
            (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(0);
          } else if ((navigator as Navigator & { mozVibrate?: (pattern: number | number[]) => boolean }).mozVibrate) {
            (navigator as Navigator & { mozVibrate?: (pattern: number | number[]) => boolean }).mozVibrate?.(0);
          }
        
        // NEW: Reset vibration state
        this.isVibrating = false;
      } catch (error) {
        this.logger?.error?.('Failed to stop vibration:', error);
      }
    }
  }

  // Cleanup
  dispose(): void {
    this.stop();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const hapticManager = HapticManager.getInstance();

// Initialize haptic system when module loads
if (typeof window !== 'undefined') {
  hapticManager.initialize().catch(console.error);
} 