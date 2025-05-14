# Solana Blockchain Explorer

A modern, fast, and user-friendly explorer for the Solana blockchain. This application provides an intuitive interface to browse blocks, transactions, and accounts on the Solana network.

## Features

- **Block Explorer**
  - View recent blocks with detailed information
  - Display block height, hash, timestamp, and transaction count
  - Navigate between blocks with previous/next functionality

- **Transaction Viewer**
  - List all transactions within a block
  - View detailed transaction information including instructions, accounts, and logs
  - Display transaction status, block references, and timestamps

- **Search Functionality**
  - Search by block slot number or transaction hash
  - Smart identification of search input type
  - Quick navigation to relevant information

- **Performance Optimizations**
  - Efficient API caching with SWR (Stale-While-Revalidate)
  - Responsive design for all device sizes
  - Optimized loading states and error handling

## Architecture

- **Frontend Framework**: Next.js with TypeScript
- **Styling**: TailwindCSS for responsive design
- **Testing**: Jest with React Testing Library
- **API Integration**: Custom wrapper around Solana Web3.js
- **Caching Strategy**: SWR with custom cache configuration
- **Deployment**: Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/solana-blockchain-explorer.git
   cd solana-blockchain-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Build & Deployment Options

### Standard Build

To create a production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

### Deployment to Cloudflare Pages

This project can be deployed to Cloudflare Pages:

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to your Cloudflare account:
   ```bash
   wrangler login
   ```

3. Run the build:
   ```bash
   npm run build
   ```

4. Deploy to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy .next
   ```

#### Deployment Notes

1. **Client-Side Rendering**: 
   - The application uses client-side rendering with SWR for data fetching
   - This approach provides good performance while maintaining flexibility
   - All API data is fetched on the client side

2. **Deployment Challenges**:
   - Next.js applications with dynamic routes can be challenging to deploy as fully static sites
   - The current configuration uses client-side navigation and data fetching

3. **Alternative Deployment Options**:
   - For static sites only, you can modify `next.config.ts` to use `output: "export"`
   - For full server-side rendering support, consider Vercel or another Next.js-optimized hosting platform

## Configuration

The application can be configured through environment variables:

- `NEXT_PUBLIC_SOLANA_RPC_URL`: Primary Solana RPC endpoint (defaults to public endpoint)
- `NEXT_PUBLIC_FALLBACK_URLS`: Comma-separated list of fallback RPC endpoints
- `NEXT_PUBLIC_RATE_LIMIT`: Rate limit for API requests (requests per minute)

## License

[MIT](LICENSE)
