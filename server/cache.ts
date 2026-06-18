import NodeCache from 'node-cache';
import { getSheetRows, SHEET_SCHEMAS } from './sheets';

// Configure a memory cache with a standard TTL of 30 seconds
const localCache = new NodeCache({ stdTTL: 30, checkperiod: 5 });

/**
 * Gets cached sheet data or fetches it from Google Sheets if expired/missing.
 */
export async function getCachedSheetRows<T extends Record<string, any>>(
  authHeader: string,
  tabName: keyof typeof SHEET_SCHEMAS
): Promise<T[]> {
  const cacheKey = `sheet_data_${tabName}`;
  const cachedVal = localCache.get<T[]>(cacheKey);

  if (cachedVal !== undefined) {
    console.log(`[Cache Proxy] Hit for tab: "${tabName}"`);
    return cachedVal;
  }

  console.log(`[Cache Proxy] Miss for tab: "${tabName}". Requesting Google Sheets live...`);
  const liveRows = await getSheetRows<T>(authHeader, tabName);
  
  // Store in cache for 30 seconds
  localCache.set(cacheKey, liveRows);
  return liveRows;
}

/**
 * Force clear cache for a specific sheet tab (useful on POST/UPDATE to retain UX freshness)
 */
export function invalidateSheetCache(tabName: keyof typeof SHEET_SCHEMAS) {
  const cacheKey = `sheet_data_${tabName}`;
  localCache.del(cacheKey);
  console.log(`[Cache Proxy] Invalidated cache for tab: "${tabName}"`);
}

/**
 * Clear the entire memory cache
 */
export function clearAllCache() {
  localCache.flushAll();
  console.log('[Cache Proxy] Flushed entire memory cache.');
}
