import { AIFunction } from 'ai';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AgentWalletManager } from '../lib/AgentWalletManager';
import { Logger } from '../lib/logger';
import { Cache } from '../lib/cache';
import { validateAddress, validateAmount, validateDomain } from '../lib/validation';
import { InvalidAddressError, InvalidAmountError, InvalidDomainError, BlockchainError } from '../lib/errors';
import { NameRegistryState } from '@solana/spl-name-service';

export class SolanaVercelBridge {
    private connection: Connection;
    private walletManager: AgentWalletManager;
    private logger: Logger;
    private cache: Cache<any>;

    constructor(mnemonic: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.walletManager = new AgentWalletManager(mnemonic);
        this.logger = new Logger('SolanaVercelBridge');
        this.cache = new Cache();
    }

    async invoke(input: string, userId: string): Promise<any> {
        try {
            const { action, ...params } = JSON.parse(input);
            const wallet = await this.walletManager.getOrCreateWallet(userId);

            switch (action) {
                case 'getBalance':
                    return await this.getBalance(wallet.publicKey);
                case 'transfer':
                    if (!validateAddress(params.to)) {
                        throw new InvalidAddressError(params.to);
                    }
                    if (!validateAmount(params.amount)) {
                        throw new InvalidAmountError(params.amount);
                    }
                    return await this.transfer(wallet, params.to, params.amount);
                case 'createSNSDomain':
                    if (!validateDomain(params.domain)) {
                        throw new InvalidDomainError(params.domain);
                    }
                    return await this.createSNSDomain(wallet, params.domain);
                case 'resolveSNSDomain':
                    if (!validateDomain(params.domain)) {
                        throw new InvalidDomainError(params.domain);
                    }
                    return await this.resolveSNSDomain(params.domain);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            this.logger.error('Error in SolanaVercelBridge invoke:', { error: error.message, input, userId });
            throw new BlockchainError(`Failed to execute Solana action: ${error.message}`);
        }
    }

    async stream(input: string, userId: string): Promise<AsyncIterable<any>> {
        const result = await this.invoke(input, userId);
        async function* generator() {
            yield result;
        }
        return generator();
    }

    getTools(): AIFunction[] {
        return [
            {
                name: 'getBalance',
                description: 'Get the balance of the user\'s Solana wallet',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
            {
                name: 'transfer',
                description: 'Transfer SOL from the user\'s wallet to another address',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string', description: 'Recipient\'s Solana address' },
                        amount: { type: 'number', description: 'Amount of SOL to transfer' },
                    },
                    required: ['to', 'amount'],
                },
            },
            {
                name: 'createSNSDomain',
                description: 'Create a Solana Name Service domain',
                parameters: {
                    type: 'object',
                    properties: {
                        domain: { type: 'string', description: 'Domain name to create' },
                    },
                    required: ['domain'],
                },
            },
            {
                name: 'resolveSNSDomain',
                description: 'Resolve a Solana Name Service domain',
                parameters: {
                    type: 'object',
                    properties: {
                        domain: { type: 'string', description: 'Domain name to resolve' },
                    },
                    required: ['domain'],
                },
            },
        ];
    }

    private async getBalance(publicKey: PublicKey): Promise<{ balance: number }> {
        const cacheKey = `balance_${publicKey.toBase58()}`;
        const cachedBalance = this.cache.get(cacheKey);
        if (cachedBalance !== undefined) {
            return { balance: cachedBalance };
        }
        const balance = await this.connection.getBalance(publicKey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;
        this.cache.set(cacheKey, balanceInSol, 30000); // Cache for 30 seconds
        return { balance: balanceInSol };
    }

    private async transfer(wallet: any, to: string, amount: number): Promise<{ signature: string }> {
        const toPublicKey = new PublicKey(to);
        const transaction = await wallet.transfer(toPublicKey, amount * LAMPORTS_PER_SOL);
        const signature = await this.connection.sendTransaction(transaction);
        this.logger.info('Transfer completed', { from: wallet.publicKey.toBase58(), to, amount, signature });
        return { signature };
    }

    private async createSNSDomain(wallet: any, domain: string): Promise<{ address: string }> {
        const { pubkey } = await NameRegistryState.createNameRegistry(
            this.connection,
            domain,
            0,
            wallet.publicKey,
            wallet.publicKey,
            wallet.publicKey
        );
        this.logger.info('SNS domain created', { domain, address: pubkey.toBase58() });
        return { address: pubkey.toBase58() };
    }

    private async resolveSNSDomain(domain: string): Promise<{ owner: string }> {
        const cacheKey = `sns_${domain}`;
        const cachedOwner = this.cache.get(cacheKey);
        if (cachedOwner !== undefined) {
            return { owner: cachedOwner };
        }
        const { registry } = await NameRegistryState.retrieve(
            this.connection,
            await NameRegistryState.getHashedNameKey(domain)
        );
        const owner = registry.owner.toBase58();
        this.cache.set(cacheKey, owner, 300000); // Cache for 5 minutes
        this.logger.info('SNS domain resolved', { domain, owner });
        return { owner };
    }
}

