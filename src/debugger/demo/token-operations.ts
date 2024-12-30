import { SolanaAgentKit } from "solana-agent-kit";
import { AgentDebugger } from "../AgentDebugger";
import { PublicKey } from "@solana/web3.js";
import { StateSnapshot } from "../types";

async function demonstrateTokenDebugging() {
    // Initialize SolanaAgentKit
    const agent = new SolanaAgentKit(
        process.env.SOLANA_PRIVATE_KEY!,
        process.env.RPC_URL!,
        process.env.OPENAI_API_KEY!
    );

    // Initialize debugger with a different name
    const debugMonitor = new AgentDebugger();
    debugMonitor.attachToAgent(agent);

    // Initialize snapshot with null
    let snapshot: StateSnapshot | null = null;

    try {
        // Create pre-operation snapshot
        snapshot = debugMonitor.createSnapshot('pre-deployment');
        console.log("Created snapshot:", snapshot.id);

        // Deploy a token using the correct method signature
        const tokenResult = await agent.deployToken(9); // Only pass decimals parameter

        // View operation history
        const operationHistory = debugMonitor.getHistory();
        console.log("\nOperation History:");
        operationHistory.forEach(event => {
            console.log(`Event Type: ${event.type}`);
            console.log(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
            if (event.data.operation) {
                console.log(`Method: ${event.data.operation.methodName}`);
                console.log(`Status: ${event.data.operation.status}`);
            }
        });

        // Get metrics
        const metrics = debugMonitor.getMetrics();
        console.log("\nOperation Metrics:");
        console.log("Total Operations:", metrics.totalOperations);
        console.log("Successful Operations:", metrics.successfulOperations);
        console.log("Failed Operations:", metrics.failedOperations);

        console.log("\nToken Deployment Result:");
        console.log("Token Mint:", tokenResult.mint.toString());

    } catch (error) {
        console.error("Error during token deployment:", error);

        // Get error history
        const errorHistory = debugMonitor.getHistory()
            .filter(e => e.type === 'error');
        console.log("\nError Events:", errorHistory);

        // Restore to pre-deployment state if snapshot exists
        if (snapshot) {
            const restored = debugMonitor.restoreSnapshot(snapshot.id);
            console.log("State restored:", restored);
        }
    }
}

export { demonstrateTokenDebugging };

if (require.main === module) {
    demonstrateTokenDebugging()
        .then(() => console.log("Demo completed"))
        .catch(console.error);
}