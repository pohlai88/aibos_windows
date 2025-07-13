import { SystemInfo } from './types.ts';
import { Logger } from '../core/logger.ts';
import { EventThrottler } from '../core/event-throttler.ts';

export class SystemInfoService {
  private systemInfo: SystemInfo;
  private updateInterval?: number;
  private logger: Logger;
  private throttler: EventThrottler;
  private isMonitoring = false;

  constructor(logger: Logger, throttler: EventThrottler) {
    this.logger = logger;
    this.throttler = throttler;
    this.systemInfo = this.getDefaultSystemInfo();
  }

  private getDefaultSystemInfo(): SystemInfo {
    return {
      platform: navigator.platform || 'unknown',
      version: navigator.userAgent || 'unknown',
      architecture: navigator.platform.includes('64') ? 'x64' : 'x86',
      memory: { total: 0, available: 0, used: 0 },
      cpu: { cores: navigator.hardwareConcurrency || 1, usage: 0 },
      storage: { total: 0, available: 0, used: 0 },
      network: { status: navigator.onLine ? 'online' : 'offline' },
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.updateInterval = globalThis.setInterval(() => this.updateSystemInfo(), 5000);
    this.updateSystemInfo();
    this.setupNetworkListeners();
    this.isMonitoring = true;

    this.logger.info('System monitoring started', {
      component: 'SystemInfoService',
      action: 'startMonitoring'
    });
  }

  private setupNetworkListeners(): void {
    globalThis.addEventListener('online', () => {
      this.systemInfo.network.status = 'online';
    });
    globalThis.addEventListener('offline', () => {
      this.systemInfo.network.status = 'offline';
    });
  }

  private updateSystemInfo(): void {
    try {
      // Memory
      if ('memory' in performance) {
        const memory = (performance as Performance & { memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number } }).memory;
        if (memory?.jsHeapSizeLimit) {
          this.systemInfo.memory = {
            total: memory.jsHeapSizeLimit,
            available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
            used: memory.usedJSHeapSize,
          };
        } else {
          this.systemInfo.memory = { total: -1, available: -1, used: -1 };
        }
      }

      this.systemInfo.cpu.usage = this.estimateCPUUsage();
    } catch (error) {
      this.logger.error('Failed to update system info', {
        component: 'SystemInfoService',
        action: 'updateSystemInfo',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private estimateCPUUsage(): number {
    return Math.min(performance.now() % 100, 100);
  }

  getSystemInfo(): SystemInfo {
    return { ...this.systemInfo };
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = 0;
    }
    this.isMonitoring = false;

    this.logger.info('System monitoring stopped', {
      component: 'SystemInfoService',
      action: 'destroy'
    });
  }
}