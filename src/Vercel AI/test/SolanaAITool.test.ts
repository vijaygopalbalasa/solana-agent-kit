import { SolanaAITool } from '../src/vercel-ai/SolanaAITool';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { InvalidAddressError, InvalidAmountError } from '../src/lib/errors';

// Mock external dependencies
jest.mock('@solana/web3.js');
jest.mock('@solana/spl-token');
jest.mock('../src/lib/logger');

describe('SolanaAITool', () => {
    let solanaAITool: SolanaAITool;
    const mockPrivateKey = 'e33de30d32e38a91bc7e7e9b9b2b31cde896432a6bc76f099f3c194e65d9c2f2';
    const mockPublicKey = 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fPbMRBe1P';

    beforeEach(() => {
        solanaAITool = new SolanaAITool(mockPrivateKey);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getBalance', () => {
        it('should return the correct balance', async () => {
            const mockBalance = 1000000000; // 1 SOL
            (Connection.prototype.getBalance as jest.Mock).mockResolvedValue(mockBalance);

            const result = await solanaAITool.invoke({ action: 'getBalance', address: mockPublicKey });
            expect(JSON.parse(result.content)).toEqual({ balance: 1 });
        });

        it('should throw an error for invalid address', async () => {
            await expect(solanaAITool.invoke({ action: 'getBalance', address: 'invalid' }))
                .rejects.toThrow(InvalidAddressError);
        });
    });

    describe('transfer', () => {
        it('should successfully transfer SOL', async () => {
            const mockSignature = '2ShtTXcAEpFJ6geJjjvRxbdtUVYYkKpeNrNQcvBBWLMP5jQbQDg8mxfDkmRLpvLtArwvD6HBGXuLC9adqm6DKHbq';
            (Connection.prototype.sendTransaction as jest.Mock).mockResolvedValue(mockSignature);

            const result = await solanaAITool.invoke({ action: 'transfer', to: mockPublicKey, amount: 0.1 });
            expect(JSON.parse(result.content)).toEqual({ signature: mockSignature });
        });

        it('should throw an error for invalid address', async () => {
            await expect(solanaAITool.invoke({ action: 'transfer', to: 'invalid', amount: 0.1 }))
                .rejects.toThrow(InvalidAddressError);
        });

        it('should throw an error for invalid amount', async () => {
            await expect(solanaAITool.invoke({ action: 'transfer', to: mockPublicKey, amount: -1 }))
                .rejects.toThrow(InvalidAmountError);
        });
    });

    describe('createToken', () => {
        it('should successfully create a token', async () => {
            const mockTokenAddress = 'ATSPo5BNdQQZwtDqvF366zx3iFnkDwGG1PscQzn8LGmd';
            (Token.createMint as jest.Mock).mockResolvedValue({ publicKey: new PublicKey(mockTokenAddress) });

            const result = await solanaAITool.invoke({ action: 'createToken', name: 'TestToken', symbol: 'TEST', decimals: 9 });
            expect(JSON.parse(result.content)).toEqual({ address: mockTokenAddress });
        });
    });

    describe('mintToken', () => {
        it('should successfully mint tokens', async () => {
            const mockSignature = '4YWbwUbcGHGWPVWJTfNiWS5yzABiSMjfzMZiTiGTDVUYD2yUoz3nYKhctbMAAmKjhAkVMQHCPFKHBr8jnrPuiSyY';
            (Token.prototype.mintTo as jest.Mock).mockResolvedValue(mockSignature);

            const result = await solanaAITool.invoke({
                action: 'mintToken',
                tokenAddress: 'ATSPo5BNdQQZwtDqvF366zx3iFnkDwGG1PscQzn8LGmd',
                recipient: mockPublicKey,
                amount: 100
            });
            expect(JSON.parse(result.content)).toEqual({ signature: mockSignature });
        });

        it('should throw an error for invalid token address', async () => {
            await expect(solanaAITool.invoke({
                action: 'mintToken',
                tokenAddress: 'invalid',
                recipient: mockPublicKey,
                amount: 100
            })).rejects.toThrow(InvalidAddressError);
        });
    });

});

