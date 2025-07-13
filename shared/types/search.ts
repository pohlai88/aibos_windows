// Core search types for AI-BOS
export interface SearchResult {
  id: string;
  type: 'app' | 'command' | 'file' | 'custom' | 'system';
  title: string;
  icon?: string;
  description?: string;
  category?: string;
  priority?: number; // Higher number = higher priority
  action: () => void | Promise<void>;
  metadata?: Record<string, unknown>;
}

export interface SearchProvider {
  id: string;
  name: string;
  description?: string;
  search: (query: string, limit?: number) => Promise<SearchResult[]>;
  priority?: number; // Provider priority for result ordering
  getQuickAccess?: (limit?: number) => Promise<SearchResult[]>; // Optional quick access items
}

export interface SearchRegistry {
  providers: Map<string, SearchProvider>;
  register(provider: SearchProvider): void;
  unregister(id: string): void;
  search(query: string, limit?: number): Promise<SearchResult[]>;
  /**
   * Streams results as they arrive from each provider.
   * onResult is called with each provider's results as soon as they are available.
   */
  searchStream(query: string, onResult: (partialResults: SearchResult[]) => void, limit?: number): Promise<SearchResult[]>;
  /**
   * Gets quick access items for when search is empty.
   * Returns frequently used or important items.
   */
  getQuickAccess(limit?: number): Promise<SearchResult[]>;
}

// Search result types for better categorization
export interface AppSearchResult extends SearchResult {
  type: 'app';
  appId: string;
  category: string;
}

export interface CommandSearchResult extends SearchResult {
  type: 'command';
  command: string;
  shortcut?: string;
}

export interface FileSearchResult extends SearchResult {
  type: 'file';
  path: string;
  size?: number;
  modified?: Date;
}

export interface SystemSearchResult extends SearchResult {
  type: 'system';
  systemAction: string;
} 