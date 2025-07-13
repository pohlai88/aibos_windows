export interface SystemInfo {
  platform: string;
  version: string;
  architecture: string;
  memory: {
    total: number;
    available: number;
    used: number;
  };
  cpu: {
    cores: number;
    usage: number;
    temperature?: number;
  };
  storage: {
    total: number;
    available: number;
    used: number;
  };
  network: {
    status: 'online' | 'offline' | 'slow';
    speed?: number;
    type?: string;
  };
  battery?: {
    level: number;
    charging: boolean;
    timeRemaining?: number;
  };
}

export interface SystemCapabilities {
  notifications: boolean;
  fileSystem: boolean;
  clipboard: boolean;
  powerManagement: boolean;
  networkAccess: boolean;
  audio: boolean;
  video: boolean;
  sensors: boolean;
}

export interface PowerState {
  isCharging: boolean;
  batteryLevel: number;
  timeRemaining?: number;
  powerMode: 'performance' | 'balanced' | 'power-saver';
}