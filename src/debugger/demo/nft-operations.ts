import { SolanaAgentKit } from "solana-agent-kit";
import { AgentDebugger } from "../AgentDebugger";
import { StateSnapshot } from "../types";

async function demonstrateNFTDebugging() {
    const agent = new SolanaAgentKit(
        process.env.SOLANA_PRIVATE_KEY!,
        process.env.RPC_URL!,
        process.env.OPENAI_API_KEY!
    );

    const debugMonitor = new AgentDebugger();
    debugMonitor.attachToAgent(agent);

    let snapshot: StateSnapshot | null = null;

    try {
        snapshot = debugMonitor.createSnapshot('pre-collection');

        // Deploy NFT collection
        const collectionResult = await agent.deployCollection({
            name: "Debug Collection",
            uri: "https://metadata.uri",
        });

        const operationHistory = debugMonitor.getHistory();
        console.log("\nNFT Operation History:");
        operationHistory.forEach(event => {
            console.log(`Event Type: ${event.type}`);
            console.log(`Method: ${event.data.operation?.methodName}`);
            console.log(`Status: ${event.data.operation?.status}`);
        });

    } catch (error) {
        console.error("NFT operation failed:", error);

        if (snapshot) {
            const restored = debugMonitor.restoreSnapshot(snapshot.id);
            console.log("State restored:", restored);
        }
    }
}

export { demonstrateNFTDebugging };