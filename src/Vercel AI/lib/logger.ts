export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    info(message: string, meta?: object) {
        console.log(`[${this.context}] INFO: ${message}`, meta || '');
    }

    error(message: string, meta?: object) {
        console.error(`[${this.context}] ERROR: ${message}`, meta || '');
    }

    warn(message: string, meta?: object) {
        console.warn(`[${this.context}] WARN: ${message}`, meta || '');
    }

    debug(message: string, meta?: object) {
        console.debug(`[${this.context}] DEBUG: ${message}`, meta || '');
    }
}

