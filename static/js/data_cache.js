/**
 * GlassRain Data Cache
 * Handles client-side caching and progressive loading of data
 */

class DataCache {
    constructor(options = {}) {
        // Default cache configuration
        this.config = Object.assign({
            cachePrefix: 'glassrain_',
            maxCacheAge: 3600000, // 1 hour in milliseconds
            useLocalStorage: true,
            useSessionStorage: true,
            useMemoryCache: true,
            useIndexedDB: false,  // More complex, disabled by default
            progressiveLoad: true,
            compressionEnabled: false, // Consider enabling for large data
            debug: false
        }, options);
        
        // Initialize cache stores
        this.memoryCache = {};
        
        // Register event listeners
        window.addEventListener('beforeunload', () => {
            this.cleanupExpiredCache();
        });
        
        // Log initialization if debug enabled
        if (this.config.debug) {
            console.log('GlassRain DataCache initialized with config:', this.config);
        }
    }
    
    /**
     * Set data in the cache
     * @param {string} key - The cache key
     * @param {any} data - The data to cache
     * @param {Object} options - Additional options
     */
    async set(key, data, options = {}) {
        const cacheKey = this.config.cachePrefix + key;
        const timestamp = Date.now();
        const maxAge = options.maxAge || this.config.maxCacheAge;
        
        // Prepare cache entry
        const cacheEntry = {
            data: data,
            timestamp: timestamp,
            expires: timestamp + maxAge,
            version: options.version || 1,
            metadata: options.metadata || {}
        };
        
        // Store in memory cache if enabled
        if (this.config.useMemoryCache) {
            this.memoryCache[cacheKey] = cacheEntry;
        }
        
        // Store in localStorage if enabled
        if (this.config.useLocalStorage) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
            } catch (error) {
                console.warn('Failed to store in localStorage:', error);
            }
        }
        
        // Store in sessionStorage if enabled
        if (this.config.useSessionStorage) {
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
            } catch (error) {
                console.warn('Failed to store in sessionStorage:', error);
            }
        }
        
        if (this.config.debug) {
            console.log(`Cached data for ${key} with expiry in ${maxAge/1000}s`);
        }
        
        return true;
    }
    
    /**
     * Get data from the cache
     * @param {string} key - The cache key
     * @param {Object} options - Additional options
     * @returns {any} The cached data or null if not found
     */
    async get(key, options = {}) {
        const cacheKey = this.config.cachePrefix + key;
        const currentTime = Date.now();
        
        // Check memory cache first (fastest)
        if (this.config.useMemoryCache && this.memoryCache[cacheKey]) {
            const entry = this.memoryCache[cacheKey];
            
            // Check if entry is still valid
            if (entry.expires > currentTime) {
                if (this.config.debug) {
                    console.log(`Cache hit (memory) for ${key}`);
                }
                return entry.data;
            }
        }
        
        // Check localStorage
        if (this.config.useLocalStorage) {
            try {
                const rawEntry = localStorage.getItem(cacheKey);
                if (rawEntry) {
                    const entry = JSON.parse(rawEntry);
                    
                    // Check if entry is still valid
                    if (entry.expires > currentTime) {
                        // Sync with memory cache
                        if (this.config.useMemoryCache) {
                            this.memoryCache[cacheKey] = entry;
                        }
                        
                        if (this.config.debug) {
                            console.log(`Cache hit (localStorage) for ${key}`);
                        }
                        return entry.data;
                    }
                }
            } catch (error) {
                console.warn('Error retrieving from localStorage:', error);
            }
        }
        
        // Check sessionStorage
        if (this.config.useSessionStorage) {
            try {
                const rawEntry = sessionStorage.getItem(cacheKey);
                if (rawEntry) {
                    const entry = JSON.parse(rawEntry);
                    
                    // Check if entry is still valid
                    if (entry.expires > currentTime) {
                        // Sync with memory cache
                        if (this.config.useMemoryCache) {
                            this.memoryCache[cacheKey] = entry;
                        }
                        
                        if (this.config.debug) {
                            console.log(`Cache hit (sessionStorage) for ${key}`);
                        }
                        return entry.data;
                    }
                }
            } catch (error) {
                console.warn('Error retrieving from sessionStorage:', error);
            }
        }
        
        if (this.config.debug) {
            console.log(`Cache miss for ${key}`);
        }
        
        return null;
    }
    
    /**
     * Clear a specific item from the cache
     * @param {string} key - The cache key
     */
    async clear(key) {
        const cacheKey = this.config.cachePrefix + key;
        
        // Clear from memory cache
        if (this.config.useMemoryCache && this.memoryCache[cacheKey]) {
            delete this.memoryCache[cacheKey];
        }
        
        // Clear from localStorage
        if (this.config.useLocalStorage) {
            try {
                localStorage.removeItem(cacheKey);
            } catch (error) {
                console.warn('Error removing from localStorage:', error);
            }
        }
        
        // Clear from sessionStorage
        if (this.config.useSessionStorage) {
            try {
                sessionStorage.removeItem(cacheKey);
            } catch (error) {
                console.warn('Error removing from sessionStorage:', error);
            }
        }
        
        if (this.config.debug) {
            console.log(`Cleared cache for ${key}`);
        }
        
        return true;
    }
    
    /**
     * Clear all cache data
     */
    async clearAll() {
        // Clear memory cache
        this.memoryCache = {};
        
        // Clear localStorage with our prefix
        if (this.config.useLocalStorage) {
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(this.config.cachePrefix)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (error) {
                console.warn('Error clearing localStorage:', error);
            }
        }
        
        // Clear sessionStorage with our prefix
        if (this.config.useSessionStorage) {
            try {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith(this.config.cachePrefix)) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (error) {
                console.warn('Error clearing sessionStorage:', error);
            }
        }
        
        if (this.config.debug) {
            console.log('Cleared all cache data');
        }
        
        return true;
    }
    
    /**
     * Clean up expired cache entries
     */
    async cleanupExpiredCache() {
        const currentTime = Date.now();
        
        // Clean memory cache
        if (this.config.useMemoryCache) {
            Object.keys(this.memoryCache).forEach(key => {
                if (this.memoryCache[key].expires < currentTime) {
                    delete this.memoryCache[key];
                }
            });
        }
        
        // Clean localStorage
        if (this.config.useLocalStorage) {
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(this.config.cachePrefix)) {
                        try {
                            const entry = JSON.parse(localStorage.getItem(key));
                            if (entry.expires < currentTime) {
                                localStorage.removeItem(key);
                            }
                        } catch (e) {
                            // Invalid entry, remove it
                            localStorage.removeItem(key);
                        }
                    }
                });
            } catch (error) {
                console.warn('Error cleaning localStorage:', error);
            }
        }
        
        // Clean sessionStorage
        if (this.config.useSessionStorage) {
            try {
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith(this.config.cachePrefix)) {
                        try {
                            const entry = JSON.parse(sessionStorage.getItem(key));
                            if (entry.expires < currentTime) {
                                sessionStorage.removeItem(key);
                            }
                        } catch (e) {
                            // Invalid entry, remove it
                            sessionStorage.removeItem(key);
                        }
                    }
                });
            } catch (error) {
                console.warn('Error cleaning sessionStorage:', error);
            }
        }
        
        if (this.config.debug) {
            console.log('Cleaned up expired cache entries');
        }
        
        return true;
    }
    
    /**
     * Fetch data with progressive loading and caching
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch and cache options
     * @returns {Promise<any>} - The fetched data
     */
    async fetchWithCache(url, options = {}) {
        const cacheKey = options.cacheKey || url;
        const cacheTTL = options.cacheTTL || this.config.maxCacheAge;
        const fetchOptions = options.fetchOptions || {};
        const progressCallback = options.onProgress || null;
        
        // Try to get from cache first
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
            // We have cached data, use it immediately
            if (progressCallback) {
                progressCallback(100, true, cachedData);
            }
            
            // If we don't want background refresh, just return the cached data
            if (!options.backgroundRefresh) {
                return cachedData;
            }
            
            // Refresh in background if requested
            if (options.backgroundRefresh) {
                this.fetchAndCache(url, cacheKey, fetchOptions, cacheTTL, progressCallback)
                    .catch(error => console.warn('Background refresh failed:', error));
            }
            
            return cachedData;
        }
        
        // No cached data available, do a regular fetch
        return this.fetchAndCache(url, cacheKey, fetchOptions, cacheTTL, progressCallback);
    }
    
    /**
     * Fetch and cache data with progress tracking
     * @private
     */
    async fetchAndCache(url, cacheKey, fetchOptions, cacheTTL, progressCallback) {
        // Create a low-res placeholder for certain data types if progressive loading is enabled
        if (this.config.progressiveLoad && progressCallback && url.includes('/api/')) {
            // Generate appropriate placeholder based on endpoint
            let placeholder = null;
            
            if (url.includes('/addresses')) {
                placeholder = { addresses: [{id: 0, address: 'Loading...'}] };
            } else if (url.includes('/home/')) {
                placeholder = { 
                    id: 0, 
                    address: 'Loading...', 
                    energy_score: '--',
                    square_feet: '----', 
                    year_built: '----'
                };
            } else if (url.includes('/service_categories')) {
                placeholder = { categories: [{id: 0, name: 'Loading...'}] };
            }
            
            if (placeholder) {
                progressCallback(10, false, placeholder);
            }
        }
        
        try {
            // Perform the actual fetch
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            
            // Notify progress
            if (progressCallback) {
                progressCallback(50, false);
            }
            
            // Parse the response
            const data = await response.json();
            
            // Notify complete
            if (progressCallback) {
                progressCallback(100, true, data);
            }
            
            // Cache the successful response
            await this.set(cacheKey, data, { maxAge: cacheTTL });
            
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.GlassRainDataCache = DataCache;