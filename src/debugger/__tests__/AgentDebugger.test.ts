import { SolanaAgentKit } from "solana-agent-kit";
import { PublicKey } from "@solana/web3.js";
import { AgentDebugger } from "../AgentDebugger";

describe('AgentDebugger', () => {
    let debugInstance: AgentDebugger;
    const MOCK_PUBKEY = new PublicKey("11111111111111111111111111111111");

    beforeEach(() => {
        debugInstance = new AgentDebugger();
    });

    test('should create and restore snapshots', () => {
        const snapshot = debugInstance.createSnapshot('Test snapshot');
        expect(snapshot).toBeDefined();
        expect(snapshot.label).toBe('Test snapshot');

        const restored = debugInstance.restoreSnapshot(snapshot.id);
        expect(restored).toBe(true);
    });

    test('should track operation history', () => {
        const history = debugInstance.getHistory();
        expect(Array.isArray(history)).toBe(true);
    });

    test('should provide metrics', () => {
        const metrics = debugInstance.getMetrics();
        expect(metrics).toHaveProperty('totalOperations');
        expect(metrics).toHaveProperty('successfulOperations');
        expect(metrics).toHaveProperty('failedOperations');
    });

    test('should handle agent attachment', () => {
        // Create minimal mock that only has properties we need
        const mockAgent = {
            connection: {},
            wallet: {},
            wallet_address: MOCK_PUBKEY
        };

        expect(() => {
            debugInstance.attachToAgent(mockAgent as unknown as SolanaAgentKit);
        }).not.toThrow();
    });
});