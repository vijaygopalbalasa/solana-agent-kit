# Solana AI SDK

This SDK provides a seamless integration between AI models and Solana blockchain operations, leveraging the Vercel AI SDK.

## Features

- Solana blockchain operations (balance checking, token transfers, NFT minting, etc.)
- Integration with Vercel AI SDK
- LangChain compatibility
- User-specific wallet management

## Installation

\`\`\`bash
npm install solana-ai-sdk
\`\`\`

## Error Handling

The SDK uses custom error types for better error handling:

- `SolanaAIError`: Base error class for the SDK
- `InvalidActionError`: Thrown when an invalid action is requested
- `BlockchainError`: Thrown when a blockchain operation fails
- `WalletError`: Thrown when there's an issue with the wallet
- `InsufficientFundsError`: Thrown when a wallet has insufficient funds for an operation
- `InvalidAddressError`: Thrown when an invalid Solana address is provided
- `RateLimitError`: Thrown when API rate limits are exceeded

## API Reference

### SolanaAITool

- `invoke(input: Record<string, any>): Promise<any>`

Supported actions:
- `getBalance`
- `transfer`
- `createToken`
- `mintToken`
- `createNFT`
- `stakeSOL`
- `createPDA`

### SolanaVercelBridge

- `invoke(input: string, userId: string): Promise<any>`
- `stream(input: string, userId: string): Promise<AsyncIterable<any>>`
- `getTools(): AIFunction[]`

The `invoke` method supports the following actions:
- `getBalance`: Get the balance of a user's wallet
- `transfer`: Transfer SOL from the user's wallet to another address
- `createToken`: Create a new SPL token
- `mintToken`: Mint tokens to a specified address
- `createNFT`: Create a new NFT
- `stakeSOL`: Stake SOL to a validator
- `createPDA`: Create a Program Derived Address

## Testing

The SDK includes a comprehensive test suite covering individual components and integration tests. To run the tests:

\`\`\`bash
npm run test
\`\`\`

This will run all unit tests and integration tests, ensuring the reliability and correctness of the SDK's functionality.

