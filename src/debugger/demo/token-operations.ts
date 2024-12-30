import { SolanaAgentKit } from "solana-agent-kit";
import { AgentDebugger } from "../AgentDebugger";
import { Keypair, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { StateSnapshot } from "../types";
import bs58 from "bs58"; // Import base58 encoder

async function demonstrateTokenDebugging() {
    if (!process.env.SOLANA_PRIVATE_KEY || !process.env.RPC_URL || !process.env.OPENAI_API_KEY) {
        throw new Error(
            "Missing required environment variables. Please set SOLANA_PRIVATE_KEY, RPC_URL, and OPENAI_API_KEY."
        );
    }

    // Parse private key
    let base58PrivateKey: string;
    let keypair: Keypair;
    try {
        const secretKeyArray = JSON.parse(process.env.SOLANA_PRIVATE_KEY) as number[];
        const secretKeyUint8 = Uint8Array.from(secretKeyArray);
        base58PrivateKey = bs58.encode(secretKeyUint8);
        keypair = Keypair.fromSecretKey(secretKeyUint8);
    } catch (error) {
        throw new Error("Invalid SOLANA_PRIVATE_KEY. Ensure it is a valid JSON array.");
    }

    const agent = new SolanaAgentKit(
        base58PrivateKey,
        process.env.RPC_URL || "https://api.devnet.solana.com",
        process.env.OPENAI_API_KEY!
    );

    const debugMonitor = new AgentDebugger();
    debugMonitor.attachToAgent(agent);

    let snapshot: StateSnapshot | null = null;

    try {
        console.log("Using wallet:", keypair.publicKey.toBase58());

        snapshot = debugMonitor.createSnapshot("pre-deployment");
        console.log("Created snapshot:", snapshot.id);

        const name = "MyToken";
        const uri = "https://example.com/token-metadata";
        const symbol = "MTK";
        const decimals = 9;

        // Simulate transaction with proper instructions
        console.log("\n🔍 Simulating transaction...");
        const lamports = await agent.connection.getMinimumBalanceForRentExemption(0);
        const recipientPublicKey = new PublicKey("11111111111111111111111111111111"); // Replace with a valid recipient

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: recipientPublicKey,
                lamports: lamports,
            })
        );
        transaction.feePayer = keypair.publicKey;

        const simulationResult = await agent.connection.simulateTransaction(transaction);
        if (simulationResult.value.err) {
            console.error("❌ Simulation failed:", simulationResult.value.err);
            console.error("Logs:", simulationResult.value.logs);
            throw new Error("Simulation failed. Aborting token deployment.");
        } else {
            console.log("✅ Simulation successful");
        }

        // Execute token deployment
        const tokenResult = await agent.deployToken(name, uri, symbol, decimals);
        console.log("\n✅ Token Deployment Result:");
        console.log("Token Mint Address:", tokenResult.mint.toBase58());

        const operationHistory = debugMonitor.getHistory();
        console.log("\n📜 Operation History:");
        operationHistory.forEach((event) => {
            console.log(`Event Type: ${event.type}`);
            console.log(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
            if (event.data.operation) {
                console.log(`Method: ${event.data.operation.methodName}`);
                console.log(`Status: ${event.data.operation.status}`);
                if (event.data.operation.result) {
                    console.log(`Result: ${JSON.stringify(event.data.operation.result)}`);
                }
            }
        });

        const metrics = debugMonitor.getMetrics();
        console.log("\n📊 Operation Metrics:");
        console.log("Total Operations:", metrics.totalOperations);
        console.log("Successful Operations:", metrics.successfulOperations);
        console.log("Failed Operations:", metrics.failedOperations);

    } catch (error) {
        console.error("\n❌ Error during token deployment:", error);

        if (error instanceof Error) {
            console.error("Message:", error.message);

            if ("getLogs" in error && typeof error.getLogs === "function") {
                try {
                    const logs = await error.getLogs();
                    console.error("Transaction Logs:", logs);
                } catch (logError) {
                    console.error("Failed to fetch logs:", logError);
                }
            }
        } else {
            console.error("Unknown Error:", error);
        }

        const errorHistory = debugMonitor
            .getHistory()
            .filter((e) => e.type === "error");
        console.log("\n🚨 Error Events:");
        errorHistory.forEach((err) => {
            console.log(`Operation: ${err.data.operation?.methodName}`);
            console.log(`Error: ${err.data.operation?.error?.message}`);
            console.log(`Timestamp: ${new Date(err.timestamp).toISOString()}`);
        });

        if (snapshot) {
            const restored = debugMonitor.restoreSnapshot(snapshot.id);
            console.log("State restored:", restored ? "✅ Success" : "❌ Failed");
        }
    }
}

export { demonstrateTokenDebugging };

if (require.main === module) {
    demonstrateTokenDebugging()
        .then(() => console.log("\n✅ Demo completed"))
        .catch(console.error);
}
