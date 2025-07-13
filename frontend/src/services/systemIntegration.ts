export interface SystemInfo {
  platform: string;
  userAgent: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screenResolution: {
    width: number;
    height: number;
  };
  colorDepth: number;
  pixelDepth: number;
  timezone: string;
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface SystemCapabilities {
  webGL: boolean;
  webWorkers: boolean;
  serviceWorkers: boolean;
  pushNotifications: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  clipboard: boolean;
  fileSystem: boolean;
}

class SystemIntegrationService {
  private systemInfo: SystemInfo | null = null;
  private capabilities: SystemCapabilities | null = null;

  constructor() {
    this.initializeSystemInfo();
    this.initializeCapabilities();
  }

  private initializeSystemInfo(): void {
    this.systemInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: {
        width: screen.width,
        height: screen.height
      },
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : undefined
    };
  }

  private initializeCapabilities(): void {
    this.capabilities = {
      webGL: this.checkWebGL(),
      webWorkers: typeof Worker !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      notifications: 'Notification' in window,
      clipboard: 'clipboard' in navigator,
      fileSystem: 'showOpenFilePicker' in window
    };
  }

  private checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  getSystemInfo(): SystemInfo {
    return this.systemInfo!;
  }

  getCapabilities(): SystemCapabilities {
    return this.capabilities!;
  }

  async getPerformanceMetrics(): Promise<{
    loadTime: number;
    domReady: number;
    timestamp: string;
  }> {
    const timing = performance.timing;
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      timestamp: new Date().toISOString()
    };
  }

  async checkConnectivity(): Promise<{
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }> {
    const connection = (navigator as any).connection;
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt
    };
  }
}

export const systemIntegration = new SystemIntegrationService(); 