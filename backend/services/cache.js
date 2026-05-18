// In-memory LRU cache with cost meter counters

class LRUCache {
    constructor(maxSize = 100, ttlMs = 300000) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.cache = new Map();
        this.metrics = { totalRequests: 0, cacheHits: 0, cacheMisses: 0, apiCalls: 0, dbQueries: 0, startTime: Date.now() };
    }

    get(key) {
        this.metrics.totalRequests++;
        const entry = this.cache.get(key);
        if (!entry || Date.now() - entry.timestamp > this.ttlMs) {
            if (entry) this.cache.delete(key);
            this.metrics.cacheMisses++;
            return null;
        }
        this.cache.delete(key);
        this.cache.set(key, entry);
        this.metrics.cacheHits++;
        return entry.value;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    invalidate(pattern) {
        if (typeof pattern === 'string') { this.cache.delete(pattern); }
        else { for (const k of this.cache.keys()) { if (pattern.test(k)) this.cache.delete(k); } }
    }

    clear() { this.cache.clear(); }
    trackApiCall() { this.metrics.apiCalls++; }
    trackDbQuery() { this.metrics.dbQueries++; }

    getCostMetrics() {
        const upSec = (Date.now() - this.metrics.startTime) / 1000;
        const hitRate = this.metrics.totalRequests > 0 ? Math.round((this.metrics.cacheHits / this.metrics.totalRequests) * 100) : 0;
        return {
            cacheHitRate: hitRate, totalRequests: this.metrics.totalRequests,
            cacheHits: this.metrics.cacheHits, cacheMisses: this.metrics.cacheMisses,
            apiCalls: this.metrics.apiCalls, dbQueries: this.metrics.dbQueries,
            cacheSize: this.cache.size, uptimeMinutes: Math.round(upSec / 60),
            estimatedMonthlyCost: '$5.00'
        };
    }
}

module.exports = new LRUCache();
