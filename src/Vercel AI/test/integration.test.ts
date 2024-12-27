import { SolanaAIModel } from '../src/vercel-ai/SolanaAIModel';
import { SolanaAITool } from '../src/vercel-ai/SolanaAITool';
import { SolanaVercelBridge } from '../src/vercel-ai/SolanaVercelBridge';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

// This test suite requires a working Solana devnet connection
// and will perform actual blockchain operations.
// Use with caution and ensure you're on devnet.

describe('Solana AI SDK Integration Tests', () => {
    const devnetUrl = 'https://api.devnet.solana.com';
    const connection = new Connection(devnetUrl, 'confirmed');
    let keypair: Keypair;
    let solanaAIModel: SolanaAIModel;
    let solanaAITool: SolanaAITool;
    let solanaVercelBridge: SolanaVercelBridge;

    beforeAll(async () => {
        keypair = Keypair.generate();
        const airdropSignature = await connection.requestAirdrop(keypair.publicKey, 1 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSignature);

        solanaAIModel = new SolanaAIModel(keypair.secretKey.toString('hex'), devnetUrl);
        solanaAITool = new SolanaAITool(keypair.secretKey.toString('hex'), devnetUrl);
        solanaVercelBridge = new SolanaVercelBridge('test test test test test test test test test test test junk', devnetUrl);
    });

    it('should get balance using SolanaAIModel', async () => {
        const result = await solanaAIModel.invoke(`getBalance ${keypair.publicKey.toBase58()}`);
        const { balance } = JSON.parse(result.content);
        expect(balance).toBeGreaterThan(0);
    });

    it('should transfer SOL using SolanaAITool', async () => {
        const recipient = Keypair.generate().publicKey;
        const result = await solanaAITool.invoke({
            action: 'transfer',
            to: recipient.toBase58(),
            amount: 0.1
        });
        const { signature } = JSON.parse(result.content);
        expect(signature).toBeTruthy();

        // Verify the transfer
        const recipientBalance = await connection.getBalance(recipient);
        expect(recipientBalance).toBe(0.1 * LAMPORTS_PER_SOL);
    });

    it('should create and resolve SNS domain using SolanaVercelBridge', async () => {
        const createResult = await solanaVercelBridge.invoke(JSON.stringify({
            action: 'createSNSDomain',
            domain: 'test' + Date.now() + '.sol'
        }), 'testUser');
        const { address } = JSON.parse(createResult.content);
        expect(address).toBeTruthy();

        const resolveResult = await solanaVercelBridge.invoke(JSON.stringify({
            action: 'resolveSNSDomain',
            domain: 'test' + Date.now() + '.sol'
        }), 'testUser');
        const { owner } = JSON.parse(resolveResult.content);
        expect(owner).toBeTruthy();
    });
});

