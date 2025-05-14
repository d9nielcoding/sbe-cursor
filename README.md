# Solana Blockchain Explorer

A modern, fast, and user-friendly Solana blockchain explorer.

## Completed Features

- **Block Explorer**
  - View detailed information of recent blocks (block height, hash, timestamp, transaction count)
  - Navigate between blocks
  
- **Transaction Viewer**
  - View all transactions within a block
  - Transaction details (instructions, accounts, logs)
  
- **Search Functionality**
  - Support search by block slot number or transaction hash
  - Smart identification of search input type
  
- **Performance Optimizations**
  - API caching strategy using SWR
  - Responsive design for various device sizes

## Architecture

- **Frontend Framework**: Next.js + TypeScript
- **Styling**: TailwindCSS
- **Testing**: Jest + React Testing Library
- **API Integration**: Custom wrapper based on Solana Web3.js
- **Deployment**: Vercel

### Directory Structure

```
/src
  /app           # Pages and routes
    /api         # API routes (server-side)
  /components    # Reusable components
  /lib           # Utility functions and shared logic
  /types         # TypeScript type definitions
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/solana-blockchain-explorer.git
   cd solana-blockchain-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to add your private RPC endpoints with API keys.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build and Deployment

### Standard Build

```bash
npm run build
npm start
```

### Vercel Deployment

1. Fork this repository to your GitHub account
2. Connect the repository to Vercel:
   - Sign in to Vercel and click "Add New" > "Project"
   - Import your GitHub repository
   - Configure environment variables for your RPC endpoints
   - Click "Deploy"

## Configuration

This application uses a server-side proxy for Solana RPC requests to protect API keys.

### Environment Variables

Configure the application using two types of environment variables:

1. **Private variables** (server-side only):
   ```
   # Private Solana RPC endpoints (not exposed to client)
   SOLANA_RPC_URL_DEVNET=https://api.devnet.solana.com
   SOLANA_FALLBACK_URL_DEVNET=https://explorer-api.devnet.solana.com
   
   SOLANA_RPC_URL_MAINNET=your-drpc-mainnet-api-key-url-here
   SOLANA_FALLBACK_URL_MAINNET=your-fallback-mainnet-api-key-url-here
   ```

2. **Public variables** (safe for client):
   ```
   # Public environment variables (safe for client)
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_SOLANA_MAX_RETRIES=3
   NEXT_PUBLIC_SOLANA_RETRY_DELAY=1000
   ```

> **Note**: 
> - By default, this application connects to the **Solana Devnet**. 
> - To use a different network, set the `NEXT_PUBLIC_SOLANA_NETWORK` environment variable to either `devnet`, `testnet`, or `mainnet`.
> - For production use with Mainnet, add your private RPC service URLs with API keys to the server-side environment variables. The proxy API route will use these URLs while keeping the API keys secure.

### API Proxy Architecture

1. Client makes a request to internal API route (`/api/solana`)
2. Server-side API route uses private environment variables to make authenticated requests to Solana RPC
3. API keys are never exposed to the client browser

## License

[MIT](LICENSE)
