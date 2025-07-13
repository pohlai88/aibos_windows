export interface TrayItem {
  id: string;
  icon: string;
  tooltip: string;
  menu?: TrayMenu;
  onClick?: () => void;
}

export interface TrayMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface TrayMenu {
  items: TrayMenuItem[];
}

class SystemTrayManager {
  private trayItems: Map<string, TrayItem> = new Map();
  private listeners: Set<(items: TrayItem[]) => void> = new Set();

  constructor() {
    this.initializeDefaultItems();
  }

  private initializeDefaultItems(): void {
    // Add default system tray items
    this.addTrayItem({
      id: 'clock',
      icon: '🕐',
      tooltip: 'System Time',
      onClick: () => console.log('Clock clicked')
    });

    this.addTrayItem({
      id: 'network',
      icon: '🌐',
      tooltip: 'Network Status',
      onClick: () => console.log('Network clicked')
    });

    this.addTrayItem({
      id: 'volume',
      icon: '🔊',
      tooltip: 'Volume Control',
      onClick: () => console.log('Volume clicked')
    });
  }

  addTrayItem(item: TrayItem): void {
    this.trayItems.set(item.id, item);
    this.notifyListeners();
  }

  removeTrayItem(id: string): boolean {
    const removed = this.trayItems.delete(id);
    if (removed) {
      this.notifyListeners();
    }
    return removed;
  }

  getTrayItem(id: string): TrayItem | undefined {
    return this.trayItems.get(id);
  }

  getAllTrayItems(): TrayItem[] {
    return Array.from(this.trayItems.values());
  }

  updateTrayItem(id: string, updates: Partial<TrayItem>): boolean {
    const item = this.trayItems.get(id);
    if (!item) return false;

    this.trayItems.set(id, { ...item, ...updates });
    this.notifyListeners();
    return true;
  }

  subscribe(listener: (items: TrayItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getAllTrayItems()));
  }

  // Utility methods for common tray operations
  showNotification(id: string, message: string): void {
    const item = this.trayItems.get(id);
    if (item) {
      console.log(`Tray notification from ${id}: ${message}`);
    }
  }

  setIcon(id: string, icon: string): boolean {
    return this.updateTrayItem(id, { icon });
  }

  setTooltip(id: string, tooltip: string): boolean {
    return this.updateTrayItem(id, { tooltip });
  }
}

export const systemTrayManager = new SystemTrayManager(); 