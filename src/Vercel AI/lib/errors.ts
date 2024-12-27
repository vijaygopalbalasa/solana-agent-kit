export class SolanaAIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SolanaAIError';
    }
}

export class InvalidActionError extends SolanaAIError {
    constructor(action: string) {
        super(`Invalid action: ${action}. Please check the documentation for supported actions.`);
        this.name = 'InvalidActionError';
    }
}

export class BlockchainError extends SolanaAIError {
    constructor(message: string, operation?: string) {
        super(`Blockchain error${operation ? ` during ${operation}` : ''}: ${message}`);
        this.name = 'BlockchainError';
    }
}

export class WalletError extends SolanaAIError {
    constructor(message: string, walletAddress?: string) {
        super(`Wallet error${walletAddress ? ` for address ${walletAddress}` : ''}: ${message}`);
        this.name = 'WalletError';
    }
}

export class InsufficientFundsError extends WalletError {
    constructor(walletAddress: string, requiredAmount: number, availableBalance: number) {
        super(`Insufficient funds in wallet ${walletAddress}. Required: ${requiredAmount} SOL, Available: ${availableBalance} SOL`);
        this.name = 'InsufficientFundsError';
    }
}

export class InvalidAddressError extends SolanaAIError {
    constructor(address: string) {
        super(`Invalid Solana address: ${address}`);
        this.name = 'InvalidAddressError';
    }
}

export class RateLimitError extends SolanaAIError {
    constructor(message: string) {
        super(`Rate limit exceeded: ${message}`);
        this.name = 'RateLimitError';
    }
}

