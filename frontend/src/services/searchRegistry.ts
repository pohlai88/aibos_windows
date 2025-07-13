import type { SearchRegistry, SearchResult, SearchProvider } from '../../shared/types/search.ts';

class SearchRegistryImpl implements SearchRegistry {
  private providers: Map<string, SearchProvider> = new Map();
  private results: SearchResult[] = [];

  register(provider: SearchProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  async search(query: string): Promise<SearchResult[]> {
    this.results = [];
    
    const searchPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const results = await provider.search(query);
        this.results.push(...results);
        return results;
      } catch (error) {
        console.error(`Search provider ${provider.id} failed:`, error);
        return [];
      }
    });

    await Promise.all(searchPromises);
    
    // Sort results by relevance score
    this.results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    return this.results;
  }

  getResults(): SearchResult[] {
    return this.results;
  }

  clearResults(): void {
    this.results = [];
  }

  getProviders(): SearchProvider[] {
    return Array.from(this.providers.values());
  }
}

// Create and export singleton instance
export const searchRegistry = new SearchRegistryImpl();

// Helper functions for creating search results
export const createAppSearchResult = (
  id: string,
  title: string,
  description: string,
  icon: string,
  relevanceScore: number = 0.5
): SearchResult => ({
  id,
  title,
  description,
  icon,
  type: 'app',
  relevanceScore,
  action: () => ({ type: 'open-app', payload: { appId: id } })
});

export const createCommandSearchResult = (
  id: string,
  title: string,
  description: string,
  icon: string,
  relevanceScore: number = 0.5
): SearchResult => ({
  id,
  title,
  description,
  icon,
  type: 'command',
  relevanceScore,
  action: () => ({ type: 'execute-command', payload: { commandId: id } })
});

export const createSearchResult = (
  id: string,
  title: string,
  description: string,
  icon: string,
  type: 'app' | 'command' | 'file' | 'setting',
  relevanceScore: number = 0.5,
  action?: () => any
): SearchResult => ({
  id,
  title,
  description,
  icon,
  type,
  relevanceScore,
  action: action || (() => ({ type: 'no-action' }))
}); 