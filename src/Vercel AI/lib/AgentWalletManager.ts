import { Keypair, Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Logger } from './logger';
import { Cache } from './cache';
import { validateAddress, validateAmount } from './validation';
import { InvalidAddressError, InvalidAmountError, InsufficientFundsError } from './errors';

export class AgentWalletManager {
    private mnemonic: string;
    private wallets: Map<string, Keypair>;
    private connection: Connection;
    private logger: Logger;
    private cache: Cache<number>;

    constructor(mnemonic: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic');
        }
        this.mnemonic = mnemonic;
        this.wallets = new Map();
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.logger = new Logger('AgentWalletManager');
        this.cache = new Cache<number>();
    }

    async getOrCreateWallet(userId: string): Promise<Keypair> {
        if (this.wallets.has(userId)) {
            return this.wallets.get(userId)!;
        }

        const path = `m/44'/501'/${userId.charCodeAt(0)}'/${userId.charCodeAt(1)}'`;
        const seed = await bip39.mnemonicToSeed(this.mnemonic);
        const derivedSeed = derivePath(path, seed.toString('hex')).key;
        const wallet = Keypair.fromSeed(derivedSeed);

        this.wallets.set(userId, wallet);
        this.logger.info(`Created wallet for user ${userId}`, { publicKey: wallet.publicKey.toBase58() });

        return wallet;
    }

    async getBalance(userId: string): Promise<number> {
        const wallet = await this.getOrCreateWallet(userId);
        const cacheKey = `balance_${wallet.publicKey.toBase58()}`;
        const cachedBalance = this.cache.get(cacheKey);

        if (cachedBalance !== undefined) {
            return cachedBalance;
        }

        const balance = await this.connection.getBalance(wallet.publicKey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;
        this.cache.set(cacheKey, balanceInSol, 30000); // Cache for 30 seconds
        return balanceInSol;
    }

    async transfer(fromUserId: string, to: string, amount: number): Promise<string> {
        if (!validateAddress(to)) {
            throw new InvalidAddressError(to);
        }

        if (!validateAmount(amount)) {
            throw new InvalidAmountError(amount);
        }

        const fromWallet = await this.getOrCreateWallet(fromUserId);
        const toPublicKey = new PublicKey(to);

        const balance = await this.getBalance(fromUserId);
        if (balance < amount) {
            throw new InsufficientFundsError(fromWallet.publicKey.toBase58(), balance, amount);
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: toPublicKey,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        try {
            const signature = await sendAndConfirmTransaction(this.connection, transaction, [fromWallet]);
            this.logger.info('Transfer completed', { from: fromWallet.publicKey.toBase58(), to, amount, signature });
            this.cache.delete(`balance_${fromWallet.publicKey.toBase58()}`); // Invalidate cache after transfer
            return signature;
        } catch (error) {
            this.logger.error('Transfer failed', { error: error.message, from: fromWallet.publicKey.toBase58(), to, amount });
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }

    async requestAirdrop(userId: string, amount: number): Promise<string> {
        if (!validateAmount(amount)) {
            throw new InvalidAmountError(amount);
        }

        const wallet = await this.getOrCreateWallet(userId);

        try {
            const signature = await this.connection.requestAirdrop(wallet.publicKey, amount * LAMPORTS_PER_SOL);
            await this.connection.confirmTransaction(signature);
            this.logger.info('Airdrop completed', { to: wallet.publicKey.toBase58(), amount, signature });
            this.cache.delete(`balance_${wallet.publicKey.toBase58()}`); // Invalidate cache after airdrop
            return signature;
        } catch (error) {
            this.logger.error('Airdrop failed', { error: error.message, to: wallet.publicKey.toBase58(), amount });
            throw new Error(`Airdrop failed: ${error.message}`);
        }
    }

    getPublicKey(userId: string): string {
        const wallet = this.wallets.get(userId);
        if (!wallet) {
            throw new Error(`No wallet found for user ${userId}`);
        }
        return wallet.publicKey.toBase58();
    }
}

