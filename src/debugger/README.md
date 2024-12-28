# AI Agent Debugger for Solana 🔍

> A comprehensive debugging system for AI agents interacting with Solana protocols.

## 🚀 Features

* **Real-time Monitoring**: Track all AI agent actions as they happen
* **Event Logging**: Detailed history of all operations and their outcomes
* **State Snapshots**: Create and restore agent states for debugging
* **Error Tracking**: Comprehensive error capture and analysis
* **Type Safety**: Full TypeScript support with extensive type definitions

## 📦 Installation

```bash
npm install solana-agent-kit
```

## 🛠️ Quick Start

Here's a simple example of how to use the debugger:

```typescript
import { AgentDebugger } from 'solana-agent-kit';

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
    const snapshot = debugger.createSnapshot('pre-operation');
    console.log(`Created snapshot: ${snapshot.id}`);
    
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
```

## 📚 Key Components

### AgentDebugger Class

```typescript
class AgentDebugger {
    // Attach to an AI agent
    attachToAgent(agent: any): void;
    
    // Create state snapshot
    createSnapshot(description?: string): DebugSnapshot;
    
    // Get operation history
    getHistory(startTime?: number, endTime?: number): DebugEvent[];
    
    // Restore previous state
    restoreSnapshot(snapshotId: string): boolean;
}
```

### Event Types

```typescript
interface DebugEvent {
    type: 'action' | 'state' | 'error';
    data: any;
    timestamp: number;
}
```

### State Snapshots

```typescript
interface DebugSnapshot {
    id: string;
    timestamp: number;
    state: AgentState;
    description: string | undefined;
}
```

## 🔍 Advanced Usage

### Filtering Events

```typescript
// Get events from the last hour
const recentEvents = debugger.getHistory(
    Date.now() - 3600000,
    Date.now()
);

// Find error events
const errors = recentEvents.filter(e => e.type === 'error');
```

### State Management

```typescript
// Create checkpoints
debugger.createSnapshot('before-trade');
await agent.executeTrade();
debugger.createSnapshot('after-trade');

// Restore to specific checkpoint
debugger.restoreSnapshot('before-trade');
```

## 🧪 Testing

Run the test suite:

```bash
npm run test:jest
```

Expected output:
```
PASS  src/debugger/__tests__/AgentDebugger.test.ts
  AgentDebugger
    ✓ should attach to agent successfully
    ✓ should capture successful actions
    ✓ should capture action errors
    ✓ should create and restore snapshots
```

## 🙏 Acknowledgments

* Solana Foundation
* SendAI Team
* Contributors to the Solana AI Agent Kit
