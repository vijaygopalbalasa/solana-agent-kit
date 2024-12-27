import { SolanaAITool } from '../vercel-ai/SolanaAITool';
import { AgentWalletManager } from '../lib/AgentWalletManager';
import { Logger } from '../lib/logger';

export class LangChainSolanaAgent {
    private solanaAITool: SolanaAITool;
    private walletManager: AgentWalletManager;
    private logger: Logger;

    constructor(mnemonic: string, rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        this.walletManager = new AgentWalletManager(mnemonic);
        this.solanaAITool = new SolanaAITool(this.walletManager.getWallet().secretKey.toString('hex'), rpcUrl);
        this.logger = new Logger('LangChainSolanaAgent');
    }

    async execute(action: string, params: Record<string, any>): Promise<any> {
        try {
            const result = await this.solanaAITool.invoke({ action, ...params });
            this.logger.info(`Executed ${action}`, { params, result });
            return result;
        } catch (error) {
            this.logger.error(`Error executing ${action}`, { params, error: error.message });
            throw error;
        }
    }

    getAvailableActions(): string[] {
        return [
            'getBalance',
            'transfer',
            'createToken',
            'mintToken',
            'createPDA',
            'createSNSDomain',
            'resolveSNSDomain'
        ];
    }
}

