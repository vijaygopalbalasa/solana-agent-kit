import { AIFunction } from 'ai';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { logError, logInfo } from '../lib/logger';
import { NameRegistryState } from '@solana/spl-name-service';
import { validateAddress, validateAmount, validateDomain } from '../lib/validation';
import { Cache } from '../lib/cache';
import { InvalidAddressError, InvalidAmountError, InvalidDomainError } from '../lib/errors';

export class SolanaAITool implements AIFunction {
    name: string;
    description: string;
    private connection: Connection;
    private wallet: Keypair;
    private cache: Cache<any>;

    constructor(privateKey: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        this.name = 'solana_ai_tool';
        this.description = 'A tool for interacting with Solana blockchain';
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.wallet = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
        this.cache = new Cache();
    }

    async invoke(input: Record<string, any>): Promise<any> {
        try {
            switch (input.action) {
                case 'getBalance':
                    if (!validateAddress(input.address)) {
                        throw new InvalidAddressError(input.address);
                    }
                    return await this.getBalance(input.address);
                case 'transfer':
                    if (!validateAddress(input.to)) {
                        throw new InvalidAddressError(input.to);
                    }
                    if (!validateAmount(input.amount)) {
                        throw new InvalidAmountError(input.amount);
                    }
                    return await this.transfer(input.to, input.amount);
                case 'createToken':
                    return await this.createToken(input.name, input.symbol, input.decimals);
                case 'mintToken':
                    if (!validateAddress(input.tokenAddress) || !validateAddress(input.recipient)) {
                        throw new InvalidAddressError(input.tokenAddress || input.recipient);
                    }
                    if (!validateAmount(input.amount)) {
                        throw new InvalidAmountError(input.amount);
                    }
                    return await this.mintToken(input.tokenAddress, input.recipient, input.amount);
                case 'createPDA':
                    if (!validateAddress(input.programId)) {
                        throw new InvalidAddressError(input.programId);
                    }
                    return await this.createPDA(input.programId, input.seeds);
                case 'createSNSDomain':
                    if (!validateDomain(input.domain)) {
                        throw new InvalidDomainError(input.domain);
                    }
                    return await this.createSNSDomain(input.domain);
                case 'resolveSNSDomain':
                    if (!validateDomain(input.domain)) {
                        throw new InvalidDomainError(input.domain);
                    }
                    return await this.resolveSNSDomain(input.domain);
                default:
                    throw new Error(`Unknown action: ${input.action}`);
            }
        } catch (error) {
            logError(`Error in SolanaAITool (${input.action}):`, error, { input });
            throw error;
        }
    }

    private async getBalance(address?: string): Promise<{ balance: number }> {
        const publicKey = address ? new PublicKey(address) : this.wallet.publicKey;
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

    private async transfer(to: string, amount: number): Promise<{ signature: string }> {
        const toPublicKey = new PublicKey(to);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.wallet.publicKey,
                toPubkey: toPublicKey,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );
        const signature = await sendAndConfirmTransaction(this.connection, transaction, [this.wallet]);
        logInfo('Transfer completed', { to, amount, signature });
        return { signature };
    }

    private async createToken(name: string, symbol: string, decimals: number): Promise<{ address: string }> {
        const token = await Token.createMint(
            this.connection,
            this.wallet,
            this.wallet.publicKey,
            null,
            decimals,
            TOKEN_PROGRAM_ID
        );
        logInfo('Token created', { name, symbol, decimals, address: token.publicKey.toBase58() });
        return { address: token.publicKey.toBase58() };
    }

    private async mintToken(tokenAddress: string, recipient: string, amount: number): Promise<{ signature: string }> {
        const token = new Token(this.connection, new PublicKey(tokenAddress), TOKEN_PROGRAM_ID, this.wallet);
        const recipientPublicKey = new PublicKey(recipient);
        const recipientTokenAccount = await token.getOrCreateAssociatedAccountInfo(recipientPublicKey);
        const signature = await token.mintTo(
            recipientTokenAccount.address,
            this.wallet.publicKey,
            [],
            amount * Math.pow(10, await token.getMintInfo().then(info => info.decimals))
        );
        logInfo('Token minted', { tokenAddress, recipient, amount, signature });
        return { signature };
    }

    private async createPDA(programId: string, seeds: string[]): Promise<{ address: string }> {
        const programPubkey = new PublicKey(programId);
        const seedBuffers = seeds.map(seed => Buffer.from(seed));
        const [pda] = await PublicKey.findProgramAddress(seedBuffers, programPubkey);
        logInfo('PDA created', { programId, seeds, address: pda.toBase58() });
        return { address: pda.toBase58() };
    }

    private async createSNSDomain(domain: string): Promise<{ address: string }> {
        const { pubkey } = await NameRegistryState.createNameRegistry(
            this.connection,
            domain,
            0,
            this.wallet.publicKey,
            this.wallet.publicKey,
            this.wallet.publicKey
        );
        logInfo('SNS domain created', { domain, address: pubkey.toBase58() });
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
        logInfo('SNS domain resolved', { domain, owner });
        return { owner };
    }
}

