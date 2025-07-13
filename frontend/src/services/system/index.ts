import { SystemInfoService } from './system-info.ts';
import { PowerManagementService } from './power-management.ts';
import { CapabilitiesDetector } from './capabilities-detector.ts';
import { SystemInfo, SystemCapabilities, PowerState } from './types.ts';
import { EnterpriseLogger } from '../core/logger.ts';
import { EventThrottler } from '../core/event-throttler.ts';
import { PermissionManager } from '../core/permissions.ts';

export class SystemService {
  private systemInfo: SystemInfoService;
  private powerManagement: PowerManagementService;
  private capabilities: CapabilitiesDetector;
  private permissions: PermissionManager;
  private logger: EnterpriseLogger;
  private throttler: EventThrottler;
  private isInitialized = false;

  constructor() {
    this.logger = new EnterpriseLogger();
    this.throttler = new EventThrottler();
    this.systemInfo = new SystemInfoService(this.logger, this.throttler);
    this.powerManagement = new PowerManagementService(this.logger, this.throttler);
    this.capabilities = new CapabilitiesDetector();
    this.permissions = new PermissionManager(this.logger);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const capabilities = this.capabilities.detect();
      await this.permissions.requestPermissions(capabilities);
      this.systemInfo.startMonitoring();
      await this.powerManagement.initialize(capabilities);
      this.isInitialized = true;

      this.logger.info('System Service initialized successfully', {
        component: 'SystemService',
        action: 'initialize'
      });
    } catch (error) {
      this.logger.error('Failed to initialize System Service', {
        component: 'SystemService',
        action: 'initialize',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  // Public API methods
  getSystemInfo(): SystemInfo {
    return this.systemInfo.getSystemInfo();
  }

  getCapabilities(): SystemCapabilities {
    return this.capabilities.detect();
  }

  getPowerState(): PowerState | null {
    return this.powerManagement.getPowerState();
  }

  getBatteryInfo() {
    return this.powerManagement.getBatteryInfo();
  }

  getLogger() {
    return this.logger;
  }

  destroy(): void {
    this.systemInfo.destroy();
    this.throttler.clear();
    this.isInitialized = false;

    this.logger.info('System Service destroyed', {
      component: 'SystemService',
      action: 'destroy'
    });
  }
}

// Export types for external use
export * from './types.ts';
export { EnterpriseLogger } from '../core/logger.ts';
export { EventThrottler } from '../core/event-throttler.ts';