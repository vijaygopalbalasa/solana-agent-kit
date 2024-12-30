import { EventEmitter } from 'events';
import { SolanaAgentKit } from 'solana-agent-kit';
import { PublicKey } from '@solana/web3.js';
import {
    DebuggerConfig,
    DebuggerState,
    SolanaOperation,
    DebugEvent,
    StateSnapshot,
    MonitoredMethods
} from './types';

export class AgentDebugger extends EventEmitter {
    private state: DebuggerState;
    private config: DebuggerConfig;
    private snapshots: Map<string, StateSnapshot>;
    private eventLog: DebugEvent[];
    private agent?: SolanaAgentKit;

    constructor(config: Partial<DebuggerConfig> = {}) {
        super();

        this.config = {
            enabled: true,
            logLevel: 'info',
            captureStackTrace: true,
            ...config
        };

        this.state = {
            operationHistory: [],
            metrics: {
                totalOperations: 0,
                successfulOperations: 0,
                failedOperations: 0
            }
        };

        this.snapshots = new Map();
        this.eventLog = [];
    }

    public attachToAgent(agent: SolanaAgentKit): void {
        if (!this.config.enabled) return;
        this.agent = agent;

        const methodsToTrack: MonitoredMethods[] = [
            'deployToken',
            'deployCollection',
            'mintNFT',
            'transfer',
            'requestFaucetFunds',
            'getBalance',
            'trade',
            'stake',
            'sendCompressedAirdrop',
            'createOrcaSingleSidedWhirlpool'
        ];

        methodsToTrack.forEach(methodName => {
            const originalMethod = (agent as any)[methodName] as Function;
            if (typeof originalMethod === 'function') {
                (agent as any)[methodName] = async (...args: any[]) => {
                    const operationId = this.generateId();
                    const startTime = Date.now();

                    const operation: SolanaOperation = {
                        id: operationId,
                        methodName,
                        args: this.sanitizeArgs(args),
                        startTime,
                        status: 'pending'
                    };

                    this.logEvent({
                        id: this.generateId(),
                        type: 'operation-start',
                        data: { operation },
                        timestamp: startTime
                    });

                    try {
                        const result = await originalMethod.apply(agent, args);

                        operation.status = 'success';
                        operation.endTime = Date.now();
                        operation.result = this.sanitizeResult(result);

                        this.logEvent({
                            id: this.generateId(),
                            type: 'operation-end',
                            data: { operation },
                            timestamp: operation.endTime
                        });

                        this.updateMetrics(operation);
                        return result;

                    } catch (error) {
                        operation.status = 'error';
                        operation.endTime = Date.now();
                        operation.error = error as Error;

                        this.logEvent({
                            id: this.generateId(),
                            type: 'error',
                            data: { operation, error: error as Error },
                            timestamp: operation.endTime
                        });

                        this.updateMetrics(operation);
                        throw error;
                    }
                };
            }
        });
    }

    public createSnapshot(label?: string): StateSnapshot {
        const snapshot: StateSnapshot = {
            id: this.generateId(),
            timestamp: Date.now(),
            state: { ...this.state },
            label: label || undefined
        };

        this.snapshots.set(snapshot.id, snapshot);
        return snapshot;
    }

    public getHistory(startTime?: number, endTime?: number): DebugEvent[] {
        return this.eventLog.filter(event => {
            if (startTime && event.timestamp < startTime) return false;
            if (endTime && event.timestamp > endTime) return false;
            return true;
        });
    }

    public restoreSnapshot(snapshotId: string): boolean {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) return false;

        this.state = { ...snapshot.state };
        return true;
    }

    public getMetrics(): DebuggerState['metrics'] {
        const totalTime = this.state.operationHistory.reduce((acc, op) => {
            if (op.startTime && op.endTime) {
                return acc + (op.endTime - op.startTime);
            }
            return acc;
        }, 0);

        return {
            ...this.state.metrics,
            averageOperationTime:
                this.state.metrics.totalOperations > 0
                    ? totalTime / this.state.metrics.totalOperations
                    : undefined
        };
    }

    private updateMetrics(operation: SolanaOperation): void {
        this.state.metrics.totalOperations++;
        if (operation.status === 'success') {
            this.state.metrics.successfulOperations++;
        } else if (operation.status === 'error') {
            this.state.metrics.failedOperations++;
        }
    }

    private logEvent(event: DebugEvent): void {
        this.eventLog.push(event);
        this.emit('debug:event', event);
    }

    private sanitizeArgs(args: any[]): any[] {
        return args.map(arg => {
            if (arg instanceof PublicKey) {
                return arg.toString();
            }
            return arg;
        });
    }

    private sanitizeResult(result: any): any {
        if (result instanceof PublicKey) {
            return result.toString();
        }
        if (Array.isArray(result)) {
            return result.map(item => this.sanitizeResult(item));
        }
        if (result && typeof result === 'object') {
            const sanitized: Record<string, any> = {};
            for (const [key, value] of Object.entries(result)) {
                sanitized[key] = this.sanitizeResult(value);
            }
            return sanitized;
        }
        return result;
    }

    private generateId(): string {
        return `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}