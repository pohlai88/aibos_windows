export interface App {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  author: string;
  size: number;
  downloads: number;
  rating: number;
  tags: string[];
}

export interface AppInstallation {
  appId: string;
  version: string;
  installDate: Date;
  lastUpdated: Date;
  status: 'installed' | 'updating' | 'error';
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  settings: Record<string, any>;
}

class AIBOSPlatformService {
  private apps: App[] = [];
  private installations: Map<string, AppInstallation> = new Map();
  private tenants: Map<string, Tenant> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample apps
    this.apps = [
      {
        id: 'sample-app-1',
        name: 'Sample App 1',
        version: '1.0.0',
        description: 'A sample application',
        icon: '📱',
        category: 'productivity',
        author: 'AIBOS Team',
        size: 1024 * 1024, // 1MB
        downloads: 100,
        rating: 4.5,
        tags: ['sample', 'demo']
      }
    ];

    // Sample tenant
    const sampleTenant: Tenant = {
      id: 'default-tenant',
      name: 'Default User',
      email: 'user@example.com',
      plan: 'free',
      createdAt: new Date(),
      settings: {}
    };
    this.tenants.set(sampleTenant.id, sampleTenant);
  }

  // App management
  async getApps(): Promise<App[]> {
    return [...this.apps];
  }

  async getApp(id: string): Promise<App | null> {
    return this.apps.find(app => app.id === id) || null;
  }

  async installApp(appId: string): Promise<boolean> {
    const app = await this.getApp(appId);
    if (!app) return false;

    const installation: AppInstallation = {
      appId,
      version: app.version,
      installDate: new Date(),
      lastUpdated: new Date(),
      status: 'installed'
    };

    this.installations.set(appId, installation);
    return true;
  }

  async uninstallApp(appId: string): Promise<boolean> {
    return this.installations.delete(appId);
  }

  async getInstalledApps(): Promise<AppInstallation[]> {
    return Array.from(this.installations.values());
  }

  // Tenant management
  async getTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async getTenant(id: string): Promise<Tenant | null> {
    return this.tenants.get(id) || null;
  }

  async createTenant(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<string> {
    const id = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTenant: Tenant = {
      ...tenant,
      id,
      createdAt: new Date()
    };
    this.tenants.set(id, newTenant);
    return id;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<boolean> {
    const tenant = this.tenants.get(id);
    if (!tenant) return false;

    this.tenants.set(id, { ...tenant, ...updates });
    return true;
  }
}

export const aibosPlatformService = new AIBOSPlatformService(); 