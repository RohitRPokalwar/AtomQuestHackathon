// API client with simple caching layer
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `HTTP ${res.status}`);
    }

    // handle CSV downloads
    if (res.headers.get('content-type')?.includes('text/csv')) {
        return res.blob();
    }

    return res.json();
}

// cached GET request
export async function apiGet(url, skipCache = false) {
    if (!skipCache) {
        const cached = apiCache.get(url);
        if (cached && Date.now() - cached.time < CACHE_TTL) {
            return cached.data;
        }
    }

    const data = await apiFetch(url);
    apiCache.set(url, { data, time: Date.now() });
    return data;
}

// POST request (clears related cache)
export async function apiPost(url, body) {
    const data = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    // invalidate related cache entries
    const base = url.split('/').slice(0, 3).join('/');
    for (const key of apiCache.keys()) {
        if (key.startsWith(base)) apiCache.delete(key);
    }
    return data;
}

// PATCH request
export async function apiPatch(url, body) {
    const data = await apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(body)
    });
    for (const key of apiCache.keys()) apiCache.delete(key);
    return data;
}

// PUT request
export async function apiPut(url, body) {
    const data = await apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
    for (const key of apiCache.keys()) apiCache.delete(key);
    return data;
}

// download CSV
export async function downloadCsv(url, filename) {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// clear all cache
export function clearApiCache() {
    apiCache.clear();
}
