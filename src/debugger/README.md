A comprehensive debugging system for AI agents interacting with Solana protocols. This debugger provides real-time monitoring, event tracking, and state management capabilities crucial for developing and maintaining reliable AI agents.
Features

🔍 Real-time Monitoring: Track all AI agent actions as they happen
📝 Event Logging: Detailed history of all operations and their outcomes
📸 State Snapshots: Create and restore agent states for debugging
❌ Error Tracking: Comprehensive error capture and analysis
🧪 Type Safety: Full TypeScript support with extensive type definitions

Installation
bashCopynpm install solana-agent-kit
Quick Start
typescriptCopyimport { AgentDebugger } from 'solana-agent-kit';

// Initialize debugger
const debugger = new AgentDebugger({
    enabled: true,
    logLevel: 'info',
    captureStackTrace: true
});

// Attach to your AI agent
debugger.attachToAgent(yourAgent);

// Monitor operations
try {
    // Create state snapshot
    debugger.createSnapshot('pre-operation');
    
    // Execute agent operations
    await yourAgent.performOperation();
    
    // Check operation history
    const history = debugger.getHistory();
    console.log('Operation sequence:', history);
} catch (error) {
    // Analyze errors
    const errorEvents = debugger.getHistory()
        .filter(e => e.type === 'error');
    console.log('Error analysis:', errorEvents);
    
    // Restore to previous state
    debugger.restoreSnapshot('pre-operation');
}
Key Components
AgentDebugger
Main debugging class with the following key methods:
typescriptCopyclass AgentDebugger {
    // Attach to an AI agent
    attachToAgent(agent: any): void;
    
    // Create state snapshot
    createSnapshot(description?: string): DebugSnapshot;
    
    // Get operation history
    getHistory(startTime?: number, endTime?: number): DebugEvent[];
    
    // Restore previous state
    restoreSnapshot(snapshotId: string): boolean;
}
Event Types
The debugger tracks different types of events:
typescriptCopyinterface DebugEvent {
    type: 'action' | 'state' | 'error';
    data: any;
    timestamp: number;
}
State Snapshots
Create and manage agent states:
typescriptCopyinterface DebugSnapshot {
    id: string;
    timestamp: number;
    state: AgentState;
    description: string | undefined;
}
Advanced Usage
Filtering Events
typescriptCopy// Get events within a time range
const recentEvents = debugger.getHistory(
    Date.now() - 3600000,  // Last hour
    Date.now()
);

// Filter error events
const errors = recentEvents.filter(e => e.type === 'error');
State Management
typescriptCopy// Create multiple snapshots
debugger.createSnapshot('before-trade');
await agent.executeTrade();
debugger.createSnapshot('after-trade');

// Restore specific state
debugger.restoreSnapshot('before-trade');
Testing
Run the test suite:
bashCopynpm run test:jest
Contributing

Fork the repository
Create your feature branch
Add your changes
Run tests
Submit a pull request

License
Apache-2 License