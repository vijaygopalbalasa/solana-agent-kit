import { SolanaAIModel } from '../vercel-ai/SolanaAIModel';
import { Connection, PublicKey } from '@solana/web3.js';

jest.mock('@solana/web3.js');

describe('SolanaAIModel', () => {
    const mockPrivateKey = 'mock_private_key';
    const mockRpcUrl = 'https://mock.solana.rpc';
    let model: SolanaAIModel;

    beforeEach(() => {
        jest.clearAllMocks();
        model = new SolanaAIModel(mockPrivateKey, mockRpcUrl);
    });

    test('invoke - getBalance', async () => {
        const mockBalance = 1000000000; // 1 SOL
        (Connection.prototype.getBalance as jest.Mock).mockResolvedValue(mockBalance);

        const result = await model.invoke('getBalance');
        const parsedResult = JSON.parse(result.content);

        expect(parsedResult).toHaveProperty('balance');
        expect(parsedResult.balance).toBe(1);
    });

    test('invoke - getRecentTransactions', async () => {
        const mockTransactions = [{ signature: 'mock_signature', slot: 12345 }];
        (Connection.prototype.getSignaturesForAddress as jest.Mock).mockResolvedValue(mockTransactions);
        (Connection.prototype.getParsedTransaction as jest.Mock).mockResolvedValue({
            transaction: { message: { instructions: [{ programId: new PublicKey('11111111111111111111111111111111') }] } }
        });

        const result = await model.invoke('getRecentTransactions');
        const parsedResult = JSON.parse(result.content);

        expect(Array.isArray(parsedResult)).toBe(true);
        expect(parsedResult.length).toBe(1);
        expect(parsedResult[0]).toHaveProperty('programId');
    });

    test('invoke - unknown action', async () => {
        await expect(model.invoke('unknownAction')).rejects.toThrow('Unknown action: unknownAction');
    });
});

