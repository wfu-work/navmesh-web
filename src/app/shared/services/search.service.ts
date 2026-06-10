import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchCacheService {
  private readonly cache: Record<string, unknown> = {};

  setCache<T>(key: string, data: T): void {
    this.cache[key] = data;
  }

  getCache<T>(key: string): T | undefined {
    return this.cache[key] as T | undefined;
  }

  clearCache(key: string): void {
    delete this.cache[key];
  }
}
