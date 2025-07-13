export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface ContextMenuOptions {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

class ContextMenuService {
  private currentMenu: ContextMenuOptions | null = null;
  private listeners: Set<(menu: ContextMenuOptions | null) => void> = new Set();

  showMenu(options: ContextMenuOptions): void {
    this.currentMenu = options;
    this.notifyListeners();
  }

  hideMenu(): void {
    this.currentMenu = null;
    this.notifyListeners();
  }

  getCurrentMenu(): ContextMenuOptions | null {
    return this.currentMenu;
  }

  subscribe(listener: (menu: ContextMenuOptions | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentMenu));
  }

  // File-specific context menu items
  getFileContextMenu(filePath: string): ContextMenuItem[] {
    return [
      {
        id: 'open',
        label: 'Open',
        icon: '📂',
        action: () => console.log('Open file:', filePath)
      },
      {
        id: 'copy',
        label: 'Copy',
        icon: '📋',
        action: () => console.log('Copy file:', filePath)
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        action: () => console.log('Delete file:', filePath)
      }
    ];
  }
}

export const contextMenuService = new ContextMenuService(); 