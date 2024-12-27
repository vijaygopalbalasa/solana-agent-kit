import { SolanaVercelBridge } from '../src/vercel-ai/SolanaVercelBridge';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AgentWalletManager } from '../src/lib/AgentWalletManager';
import { InvalidAddressError, InvalidAmountError, BlockchainError } from '../src/lib/errors';

// Mock external dependencies
jest.mock('@solana/web3.js');
jest.mock('../src/lib/AgentWalletManager');
jest.mock('../src/lib/logger');

describe('SolanaVercelBridge', () => {
    let solanaVercelBridge: SolanaVercelBridge;
    const mockMnemonic = 'test test test test test test test test test test test junk';
    const mockUserId = 'testUser123';
    const mockPublicKey = 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fPbMRBe1P';

    beforeEach(() => {
        solanaVercelBridge = new SolanaVercelBridge(mockMnemonic);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getBalance', () => {
        it('should return the correct balance', async () => {
            const mockBalance = 1 * LAMPORTS_PER_SOL; // 1 SOL
            (Connection.prototype.getBalance as jest.Mock).mockResolvedValue(mockBalance);
            (AgentWalletManager.prototype.getOrCreateWallet as jest.Mock).mockResolvedValue({ publicKey: new PublicKey(mockPublicKey) });

            const result = await solanaVercelBridge.invoke(JSON.stringify({ action: 'getBalance' }), mockUserId);
            expect(JSON.parse(result.content)).toEqual({ balance: 1 });
        });
    });

    describe('transfer', () => {
        it('should successfully transfer SOL', async () => {
            const mockSignature = '2ShtTXcAEpFJ6geJjjvRxbdtUVYYkKpeNrNQcvBBWLMP5jQbQDg8mxfDkmRLpvLtArwvD6HBGXuLC9adqm6DKHbq';
            (Connection.prototype.sendTransaction as jest.Mock).mockResolvedValue(mockSignature);
            (AgentWalletManager.prototype.getOrCreateWallet as jest.Mock).mockResolvedValue({ publicKey: new PublicKey(mockPublicKey) });

            const result = await solanaVercelBridge.invoke(JSON.stringify({ action: 'transfer', to: mockPublicKey, amount: 0.1 }), mockUserId);
            expect(JSON.parse(result.content)).toEqual({ signature: mockSignature });
        });

        it('should throw an error for invalid address', async () => {
            await expect(solanaVercelBridge.invoke(JSON.stringify({ action: 'transfer', to: 'invalid', amount: 0.1 }), mockUserId))
                .rejects.toThrow(InvalidAddressError);
        });

        it('should throw an error for invalid amount', async () => {
            await expect(solanaVercelBridge.invoke(JSON.stringify({ action: 'transfer', to: mockPublicKey, amount: -1 }), mockUserId))
                .rejects.toThrow(InvalidAmountError);
        });
    });

    describe('createSNSDomain', () => {
        it('should successfully create an SNS domain', async () => {
            const mockDomainAddress = 'SNSdomainAddressMock123';
            (Connection.prototype.sendTransaction as jest.Mock).mockResolvedValue('mockSignature');
            (AgentWalletManager.prototype.getOrCreateWallet as jest.Mock).mockResolvedValue({ publicKey: new PublicKey(mockPublicKey) });

            const result = await solanaVercelBridge.invoke(JSON.stringify({ action: 'createSNSDomain', domain: 'test.sol' }), mockUserId);
            expect(JSON.parse(result.content)).toHaveProperty('address');
        });

        it('should throw an error for invalid domain', async () => {
            await expect(solanaVercelBridge.invoke(JSON.stringify({ action: 'createSNSDomain', domain: 'invalid' }), mockUserId))
                .rejects.toThrow(BlockchainError);
        });
    });

    describe('resolveSNSDomain', () => {
        it('should successfully resolve an SNS domain', async () => {
            const mockOwner = 'SNSdomainOwnerMock123';
            (Connection.prototype.getAccountInfo as jest.Mock).mockResolvedValue({ data: Buffer.from(mockOwner) });

            const result = await solanaVercelBridge.invoke(JSON.stringify({ action: 'resolveSNSDomain', domain: 'test.sol' }), mockUserId);
            expect(JSON.parse(result.content)).toEqual({ owner: expect.any(String) });
        });

        it('should throw an error for invalid domain', async () => {
            await expect(solanaVercelBridge.invoke(JSON.stringify({ action: 'resolveSNSDomain', domain: 'invalid' }), mockUserId))
                .rejects.toThrow(BlockchainError);
        });
    });

});

