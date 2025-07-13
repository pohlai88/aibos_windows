interface Monitor {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  primary: boolean;
  active: boolean;
}

interface MonitorManager {
  getMonitors(): Monitor[];
  getPrimaryMonitor(): Monitor | null;
  getMonitorById(id: string): Monitor | null;
  setPrimaryMonitor(id: string): void;
  refreshMonitors(): Promise<void>;
}

class MonitorManagerImpl implements MonitorManager {
  private monitors: Monitor[] = [];
  private primaryMonitorId: string | null = null;

  constructor() {
    this.initializeDefaultMonitor();
  }

  private initializeDefaultMonitor(): void {
    // Create a default monitor with typical desktop resolution
    const defaultMonitor: Monitor = {
      id: 'primary',
      name: 'Primary Display',
      width: 1920,
      height: 1080,
      x: 0,
      y: 0,
      primary: true,
      active: true
    };

    this.monitors = [defaultMonitor];
    this.primaryMonitorId = defaultMonitor.id;
  }

  getMonitors(): Monitor[] {
    return [...this.monitors];
  }

  getPrimaryMonitor(): Monitor | null {
    if (!this.primaryMonitorId) return null;
    return this.getMonitorById(this.primaryMonitorId);
  }

  getMonitorById(id: string): Monitor | null {
    return this.monitors.find(monitor => monitor.id === id) || null;
  }

  setPrimaryMonitor(id: string): void {
    const monitor = this.getMonitorById(id);
    if (monitor) {
      // Update all monitors to set primary to false
      this.monitors.forEach(m => m.primary = false);
      
      // Set the specified monitor as primary
      monitor.primary = true;
      this.primaryMonitorId = id;
    }
  }

  async refreshMonitors(): Promise<void> {
    try {
      // In a real implementation, this would query the system for actual monitor information
      // For now, we'll just reinitialize with the default monitor
      this.initializeDefaultMonitor();
    } catch (error) {
      console.error('Failed to refresh monitors:', error);
    }
  }

  // Additional utility methods
  getTotalWidth(): number {
    return this.monitors.reduce((total, monitor) => {
      return Math.max(total, monitor.x + monitor.width);
    }, 0);
  }

  getTotalHeight(): number {
    return this.monitors.reduce((total, monitor) => {
      return Math.max(total, monitor.y + monitor.height);
    }, 0);
  }

  getActiveMonitors(): Monitor[] {
    return this.monitors.filter(monitor => monitor.active);
  }
}

// Create and export singleton instance
export const monitorManager = new MonitorManagerImpl(); 