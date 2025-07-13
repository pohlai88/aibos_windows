interface AdvancedCommand {
  id: string;
  name: string;
  description: string;
  category: string;
  execute: (...args: any[]) => Promise<any>;
  validate?: (...args: any[]) => boolean;
}

interface AdvancedCommandManager {
  register(command: AdvancedCommand): void;
  unregister(commandId: string): void;
  getCommand(commandId: string): AdvancedCommand | null;
  getAllCommands(): AdvancedCommand[];
  getCommandsByCategory(category: string): AdvancedCommand[];
  executeCommand(commandId: string, ...args: any[]): Promise<any>;
}

class AdvancedCommandManagerImpl implements AdvancedCommandManager {
  private commands: Map<string, AdvancedCommand> = new Map();

  constructor() {
    this.initializeDefaultCommands();
  }

  private initializeDefaultCommands(): void {
    // Register some default advanced commands
    this.register({
      id: 'system-info',
      name: 'System Information',
      description: 'Display detailed system information',
      category: 'system',
      execute: async () => {
        return {
          type: 'system-info',
          data: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            timestamp: new Date().toISOString()
          }
        };
      }
    });

    this.register({
      id: 'performance-check',
      name: 'Performance Check',
      description: 'Check system performance metrics',
      category: 'system',
      execute: async () => {
        return {
          type: 'performance-check',
          data: {
            memory: performance.memory ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit
            } : null,
            timing: performance.timing ? {
              loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
              domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            } : null,
            timestamp: new Date().toISOString()
          }
        };
      }
    });

    this.register({
      id: 'clear-cache',
      name: 'Clear Cache',
      description: 'Clear application cache and storage',
      category: 'maintenance',
      execute: async () => {
        try {
          // Clear localStorage
          localStorage.clear();
          
          // Clear sessionStorage
          sessionStorage.clear();
          
          // Clear caches if available
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          
          return {
            type: 'clear-cache',
            success: true,
            message: 'Cache cleared successfully',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            type: 'clear-cache',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      }
    });

    this.register({
      id: 'export-logs',
      name: 'Export Logs',
      description: 'Export system logs for debugging',
      category: 'maintenance',
      execute: async () => {
        // In a real implementation, this would collect logs from various sources
        const logs = {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          // Add more log data as needed
        };
        
        return {
          type: 'export-logs',
          data: logs,
          format: 'json'
        };
      }
    });
  }

  register(command: AdvancedCommand): void {
    this.commands.set(command.id, command);
  }

  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  getCommand(commandId: string): AdvancedCommand | null {
    return this.commands.get(commandId) || null;
  }

  getAllCommands(): AdvancedCommand[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): AdvancedCommand[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    const command = this.getCommand(commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found`);
    }

    // Validate arguments if validation function exists
    if (command.validate && !command.validate(...args)) {
      throw new Error(`Invalid arguments for command '${commandId}'`);
    }

    try {
      return await command.execute(...args);
    } catch (error) {
      console.error(`Error executing command '${commandId}':`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const advancedCommandManager = new AdvancedCommandManagerImpl(); 