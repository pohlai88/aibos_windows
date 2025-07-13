export interface BatteryInfo {
  level: number;
  charging: boolean;
  timeRemaining?: number;
}

export interface NetworkInfo {
  status: 'online' | 'offline' | 'slow';
  speed?: number;
  type?: string;
}

export interface RecentFileInfo {
  path: string;
  name: string;
  lastAccessed: string;
  size: number;
  type: string;
}

export interface FileOpenEvent {
  file: File;
  handle: FileSystemFileHandle;
  extension: string;
  mimeType: string;
  description: string;
}

export type SystemEvents = {
  'battery:updated': BatteryInfo;
  'network:changed': NetworkInfo;
  'file:recent-added': RecentFileInfo;
  'file:open': FileOpenEvent;
  'memory:updated': { total: number; available: number; used: number };
  'storage:updated': { total: number; available: number; used: number };
};

class TypedEventEmitter<T extends Record<string, unknown>> {
  private listeners: Map<keyof T, Set<(data: T[keyof T]) => void>> = new Map();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler as (data: T[keyof T]) => void);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler as (data: T[keyof T]) => void);
    };
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as (data: T[K]) => void)(data);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  off<K extends keyof T>(event: K, handler?: (data: T[K]) => void): void {
    if (!handler) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(handler as (data: T[keyof T]) => void);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const systemEvents = new TypedEventEmitter<SystemEvents>(); 