import { SolanaAgentKit } from "solana-agent-kit";
import { AgentDebugger } from "../AgentDebugger";
import { PublicKey } from "@solana/web3.js";
import { StateSnapshot } from "../types";

async function demonstrateDeFiDebugging() {
    const agent = new SolanaAgentKit(
        process.env.SOLANA_PRIVATE_KEY!,
        process.env.RPC_URL!,
        process.env.OPENAI_API_KEY!
    );

    const debugMonitor = new AgentDebugger();
    debugMonitor.attachToAgent(agent);

    let snapshot: StateSnapshot | null = null;

    try {
        // Create pre-trade snapshot
        snapshot = debugMonitor.createSnapshot('pre-trade');
        console.log("Created snapshot:", snapshot.id);

        // Execute trade operation
        const tradeResult = await agent.trade(
            new PublicKey("target-token-mint"), // outputMint
            100                                 // inputAmount
        );

        const operationHistory = debugMonitor.getHistory();
        console.log("\nTrade Operation History:");
        operationHistory.forEach(event => {
            console.log(`Event Type: ${event.type}`);
            console.log(`Method: ${event.data.operation?.methodName}`);
            console.log(`Status: ${event.data.operation?.status}`);
        });

        console.log("\nTrade Result:", tradeResult);

    } catch (error) {
        console.error("Trade operation failed:", error);

        if (snapshot) {
            const restored = debugMonitor.restoreSnapshot(snapshot.id);
            console.log("State restored:", restored);
        }
    }
}

export { demonstrateDeFiDebugging };