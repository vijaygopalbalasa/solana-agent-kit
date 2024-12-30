import { SolanaAgentKit } from "solana-agent-kit";
import { PublicKey } from "@solana/web3.js";

/**
 * Debugger configuration options
 */
export interface DebuggerConfig {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    captureStackTrace: boolean;
}

/**
 * Methods available in SolanaAgentKit that we can monitor
 */
export type MonitoredMethods =
    | 'deployToken'
    | 'deployCollection'
    | 'mintNFT'
    | 'transfer'
    | 'requestFaucetFunds'
    | 'getBalance'
    | 'trade'
    | 'stake'
    | 'sendCompressedAirdrop'
    | 'createOrcaSingleSidedWhirlpool';

/**
 * Represents a single Solana operation
 */
export interface SolanaOperation {
    id: string;
    methodName: MonitoredMethods;
    args: any[];
    result?: any;
    error?: Error;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'success' | 'error';
}

/**
 * Current state of the debugger
 */
export interface DebuggerState {
    lastOperation?: SolanaOperation | undefined;
    operationHistory: SolanaOperation[];
    metrics: {
        totalOperations: number;
        successfulOperations: number;
        failedOperations: number;
        averageOperationTime?: number | undefined;
    };
}

/**
 * Debug event interface
 */
export interface DebugEvent {
    id: string;
    type: 'operation-start' | 'operation-end' | 'error';
    data: {
        operation?: SolanaOperation | undefined;
        error?: Error | undefined;
    };
    timestamp: number;
}

/**
 * State snapshot for debugging
 */
export interface StateSnapshot {
    id: string;
    timestamp: number;
    state: DebuggerState;
    label?: string | undefined;
}