import { PublicKey } from '@solana/web3.js';

export function validateAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

export function validateAmount(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount);
}

export function validateDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}

