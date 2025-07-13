import type { SearchProvider, SearchResult } from '../../../shared/types/search';

export const enhancedSearchProvider: SearchProvider = {
  id: 'enhanced',
  description: 'Minimal enhanced search provider',
  async search(query: string, limit?: number): Promise<SearchResult[]> {
    // Return an empty array or a placeholder result for now
    return [];
  }
}; 