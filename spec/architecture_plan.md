# Solana Blockchain Explorer Architecture Design and Progress Tracking

## Overall Architecture

### Frontend Technology Stack
- Next.js (React framework)
- TypeScript
- TailwindCSS (UI styling)
- Jest + React Testing Library (testing)

### Application Structure
```
/app
  /components        # Reusable components
    /Header          # Common header with search functionality
  /blocks            # Block-related pages
    /[slot]          # Block detail page with transaction list
  /transactions      # Transaction-related pages
    /[signature]     # Transaction detail page
  /lib               # Utility functions and shared logic
    /solana          # Solana API wrapper
      /api.ts        # Core API service
      /__tests__     # API tests
  /types             # TypeScript type definitions
/public              # Static assets
```

## Core Function Modules

### 1. Block List Module
- Display a list of recent blocks
- Each block shows: block height, hash, timestamp, transaction count
- Navigation to block details

### 2. Block Detail Module
- Display detailed block information
- Show all transactions within the block
- Navigation between blocks (previous/next)
- Link to transaction details

### 3. Transaction Detail Module
- Display complete transaction information: hash, status, block, timestamp, etc.
- Show all instruction details
- Display account information
- Show transaction logs

### 4. Search Module
- Support search by block height (slot) or transaction hash
- Smart identification of search input type
- Navigation to appropriate page

### 5. Data Retrieval and Management
- Interact with Solana blockchain using Web3.js
- Error handling and retry mechanism with fallback endpoints
- Display loading states and error messages

## API Integration

### Solana RPC API Service
- Use public Solana RPC endpoints with fallback options
- Core API methods:
  - `getRecentBlocks`: Fetch recent blocks
  - `getBlockBySlot`: Get block by slot number
  - `getTransactionsFromBlock`: Get transactions from a specific block
  - `getTransactionBySignature`: Get detailed transaction information

### Rate Limit Handler
- Implement request queue and throttling mechanism
- Error retry logic
- Fallback to alternate endpoints when rate limited

## Current Progress

### Project Initialization
- [x] Create Next.js project and configure TypeScript
- [x] Set up TailwindCSS
- [x] Establish basic directory structure
- [x] Configure ESLint and Prettier
- [x] Set up Jest testing environment

### Core Functionality Development
- [x] Establish connection to Solana network
- [x] Implement block list functionality
- [x] Implement block detail functionality
- [x] Implement transaction list functionality (integrated into block detail)
- [x] Implement transaction detail functionality
- [x] Implement search functionality (block height and transaction hash)
- [x] Remove unnecessary `getBlockByHash` method based on updated requirements

### UI/UX Development
- [x] Design and implement main page layout
- [x] Create block list page
- [x] Create block detail page with integrated transaction list
- [x] Create transaction detail page
- [x] Implement responsive design
- [x] Optimize loading states and error handling display

### Testing
- [x] Write API service layer unit tests
- [x] Write block list page tests
- [x] Write block detail page tests
- [x] Write transaction page tests

### API Caching Strategy

To improve performance and user experience, we've designed the following API caching strategy using SWR (Stale-While-Revalidate):

#### API Calls to Cache

| API Call | Description | Stale Time | Cache Duration | Rationale |
|----------|-------------|------------|----------------|-----------|
| `getBlockBySlot` | Block details by slot number | Infinity | 24 hours | Historical block data doesn't change after confirmation |
| `getTransactionsFromBlock` | Transactions in a block | Infinity | 24 hours | Transaction lists are immutable once confirmed |
| `getTransactionBySignature` | Transaction details | Infinity | 24 hours | Transaction details don't change after confirmation |
| `getSlotLeader` | Block producer details | Infinity | 24 hours | Slot leader assignment is permanent |
| `getRecentBlocks` | Recent block list | 30 seconds | 5 minutes | Needs periodic updates but not real-time |

#### Caching Strategy Considerations

1. **Conditional Caching**
   - Longer cache times for confirmed blocks/transactions (>32 confirmations)
   - Shorter cache times for recent, potentially unconfirmed data

2. **Cache Size Management**
   - Implement maximum cache items limit (e.g., 500 blocks/transactions)
   - Use LRU (Least Recently Used) policy for cache eviction

3. **Error Handling**
   - Return cached data on error (even if stale)
   - Implement sensible retry strategies

4. **User Controls**
   - Provide manual refresh buttons for forcing data updates
   - Clear indicator when viewing cached vs. fresh data

#### Implementation Plan

1. Install and configure SWR library
2. Create custom hooks for each API call type with appropriate cache settings
3. Replace current `useEffect`-based data fetching with SWR hooks
4. Add cache invalidation triggers where appropriate
5. Implement cache debugging and monitoring tools

#### Future Caching Improvements

1. **LocalStorage Persistence**:
   - Implement SWR persistence using `localStorage` to retain cache between sessions
   - Add cache expiration timestamps for different data types

2. **Cache Size Control**:
   - Implement custom size limits by data type
   - Add monitoring tools to track cache usage

3. **Cache Warming**:
   - Pre-fetch common queries on application startup
   - Implement smart prediction of next blocks to cache

4. **Cache Invalidation Triggers**:
   - Automated invalidation when new blocks arrive
   - User-triggered global refresh

### Pending Features
- [x] Implement SWR for API caching according to defined strategy
- [x] Add sorting functionality
- [x] Implement basic pagination (via "View All" link in block detail page)
- [ ] Implement advanced pagination with page numbers for large result sets
- [x] Enhance error logging (console logging in API service)
- [ ] Implement structured error logging with severity levels
- [x] Basic performance optimization via API caching
- [ ] Additional performance optimizations (code splitting, lazy loading)
- [ ] Cross-browser compatibility testing
- [ ] Update README with comprehensive documentation
  - [ ] Project overview
  - [ ] Feature list
  - [ ] Architecture explanation
  - [ ] Installation instructions
  - [ ] Configuration options
- [ ] Set up deployment pipeline
  - [ ] Create Dockerfile and docker-compose.yml
  - [ ] Configure Cloudflare deployment 