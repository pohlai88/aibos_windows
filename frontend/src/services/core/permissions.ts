import { SystemCapabilities } from '../system/types.ts';
import { Logger } from './logger.ts';

export class PermissionManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async requestPermissions(capabilities: SystemCapabilities): Promise<void> {
    const permissions = [];
    
    if (capabilities.notifications) {
      permissions.push(this.requestNotificationPermission());
    }
    if (capabilities.clipboard) {
      permissions.push(this.requestClipboardPermission());
    }
    if (capabilities.fileSystem) {
      permissions.push(this.requestStoragePermission());
    }

    const results = await Promise.allSettled(permissions);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn('Permission request failed', {
          component: 'PermissionManager',
          action: 'requestPermissions',
          metadata: { index, error: result.reason }
        });
      }
    });

    this.logger.info('Permission requests completed', {
      component: 'PermissionManager',
      action: 'requestPermissions',
      metadata: { total: permissions.length, successful: results.filter(r => r.status === 'fulfilled').length }
    });
  }

  private requestNotificationPermission(): Promise<NotificationPermission> {
    return Notification.requestPermission();
  }

  private requestClipboardPermission(): Promise<PermissionStatus> {
    return navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
  }

  private requestStoragePermission(): Promise<PermissionStatus> {
    return navigator.permissions.query({ name: 'persistent-storage' as PermissionName });
  }
}