export class Cache<T> {
    private cache: Map<string, { value: T; expiry: number }>;

    constructor() {
        this.cache = new Map();
    }

    set(key: string, value: T, ttl: number): void {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
    }

    get(key: string): T | undefined {
        const item = this.cache.get(key);
        if (!item) return undefined;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return undefined;
        }

        return item.value;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

