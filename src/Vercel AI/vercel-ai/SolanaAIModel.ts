import { AIModel, AIModelOptions, ModelResult } from 'ai';
import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedInstruction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Logger } from '../lib/logger';
import { Cache } from '../lib/cache';
import { validateAddress } from '../lib/validation';
import { InvalidAddressError } from '../lib/errors';

export class SolanaAIModel implements AIModel {
    private connection: Connection;
    private wallet: PublicKey;
    private logger: Logger;
    private cache: Cache<any>;

    constructor(privateKey: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.wallet = new PublicKey(privateKey);
        this.logger = new Logger('SolanaAIModel');
        this.cache = new Cache();
    }

    async invoke(input: string, options?: AIModelOptions): Promise<ModelResult> {
        try {
            const [action, ...params] = input.split(' ');
            let result;

            switch (action) {
                case 'getBalance':
                    result = await this.getBalance(params[0]);
                    break;
                case 'getRecentTransactions':
                    result = await this.getRecentTransactions();
                    break;
                case 'getTokenBalance':
                    if (!validateAddress(params[0])) {
                        throw new InvalidAddressError(params[0]);
                    }
                    result = await this.getTokenBalance(params[0]);
                    break;
                case 'getProgramAccounts':
                    if (!validateAddress(params[0])) {
                        throw new InvalidAddressError(params[0]);
                    }
                    result = await this.getProgramAccounts(params[0]);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            return {
                content: JSON.stringify(result),
            };
        } catch (error) {
            this.logger.error('Error in SolanaAIModel invoke:', { error: error.message, input });
            throw new Error(`Failed to execute Solana action: ${error.message}`);
        }
    }

    async stream(input: string, options?: AIModelOptions): Promise<AsyncIterable<ModelResult>> {
        const result = await this.invoke(input, options);
        async function* generator() {
            yield result;
        }
        return generator();
    }

    private async getBalance(address?: string): Promise<{ balance: number }> {
        const publicKey = address ? new PublicKey(address) : this.wallet;
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

    private async getRecentTransactions(): Promise<ParsedInstruction[]> {
        const signatures = await this.connection.getSignaturesForAddress(this.wallet, { limit: 10 });
        const transactions = await Promise.all(
            signatures.map(sig => this.connection.getParsedTransaction(sig.signature))
        );
        return transactions
            .filter(tx => tx !== null)
            .flatMap(tx => tx!.transaction.message.instructions as ParsedInstruction[]);
    }

    private async getTokenBalance(tokenAddress: string): Promise<{ balance: number; decimals: number }> {
        const tokenPublicKey = new PublicKey(tokenAddress);
        const cacheKey = `token_balance_${this.wallet.toBase58()}_${tokenAddress}`;
        const cachedBalance = this.cache.get(cacheKey);

        if (cachedBalance !== undefined) {
            return cachedBalance;
        }

        try {
            const token = new Token(this.connection, tokenPublicKey, TOKEN_PROGRAM_ID, this.wallet);
            const accountInfo = await token.getAccountInfo(this.wallet);
            const mintInfo = await token.getMintInfo();

            const balance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
            const result = { balance, decimals: mintInfo.decimals };

            this.cache.set(cacheKey, result, 30000); // Cache for 30 seconds
            return result;
        } catch (error) {
            this.logger.error('Error getting token balance:', { error: error.message, tokenAddress });
            throw new Error(`Failed to get token balance: ${error.message}`);
        }
    }

    private async getProgramAccounts(programId: string): Promise<{ address: string; lamports: number }[]> {
        const programPublicKey = new PublicKey(programId);
        const cacheKey = `program_accounts_${programId}`;
        const cachedAccounts = this.cache.get(cacheKey);

        if (cachedAccounts !== undefined) {
            return cachedAccounts;
        }

        try {
            const accounts = await this.connection.getProgramAccounts(programPublicKey, {
                filters: [
                    {
                        dataSize: 0, // You can adjust this filter based on your needs
                    },
                ],
            });

            const result = accounts.map(({ pubkey, account }) => ({
                address: pubkey.toBase58(),
                lamports: account.lamports,
            }));

            this.cache.set(cacheKey, result, 60000); // Cache for 1 minute
            return result;
        } catch (error) {
            this.logger.error('Error getting program accounts:', { error: error.message, programId });
            throw new Error(`Failed to get program accounts: ${error.message}`);
        }
    }
}

