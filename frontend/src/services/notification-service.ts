export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };
    
    this.notifications.unshift(newNotification);
    this.notifyListeners();
    return id;
  }

  removeNotification(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const notificationService = new NotificationService(); 