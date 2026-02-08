# Meteora DLMM Liquidity Tracker

A real-time monitoring tool for [Meteora DLMM](https://www.meteora.ag/) pool bin allocations on Solana. Visualize the full liquidity distribution across all bins in any DLMM pool to identify gaps, concentration zones, and make better-informed LP allocation decisions.

**[Live Demo](https://dlmm-liq-tracker.vercel.app/pool/5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6)**

## Why

Meteora's DLMM pools distribute liquidity across discrete price bins. Understanding where liquidity is concentrated — and more importantly, where it isn't — gives LPs a significant edge:

- **Spot empty gaps** in the liquidity curve that create slippage and can be exploited or filled
- **See concentration zones** where most LPs are competing for fees
- **Compare token allocations** per bin in USD-normalized values, so a bin with 1000 low-cap tokens isn't visually misleading compared to 0.1 SOL
- **Track price movement** relative to each bin to understand how far the price needs to move to reach your positions

## Features

- **Full-range bin liquidity chart** — Fetches every on-chain bin array, not just bins around the active price. Stacked horizontal bars show Token X and Token Y allocations per bin, scaled by USD value.
- **Price range filtering** — Preset buttons to narrow the view to a specific percentage range from the active bin (e.g. -25% to +50%), with full range as the default.
- **Real-time candlestick price chart** — TradingView-style OHLCV chart powered by [lightweight-charts](https://github.com/nickvdyck/lightweight-charts) with volume histogram, crosshair tooltips, and multiple timeframes (5m / 15m / 1H / 4H / 1D / 1W).
- **Auto-refreshing prices** — Chart data polls every 10 seconds. Pool data (which hits your RPC) only re-fetches when a bin boundary crossing is detected, throttled to a max of once per 30 seconds.
- **Token metadata from Jupiter** — Token name, symbol, icon, USD price, market cap, liquidity, holder count, organic score, and verification badge — all pulled from the [Jupiter Data API](https://docs.jup.ag/).
- **Pool info at a glance** — Active bin price (in quote token + USD), bin step, copyable contract addresses, and a direct link to open the pool on Meteora.

## Tech Stack

- **Next.js 16** (App Router) with React 19
- **Meteora DLMM SDK** (`@meteora-ag/dlmm`) for on-chain bin data
- **Solana Web3.js** for RPC connectivity
- **Jupiter Data API** for token metadata and price charts
- **lightweight-charts** (TradingView) for candlestick rendering
- **Tailwind CSS 4** for styling
- **lucide-react** for icons

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana RPC URL (e.g. from [Helius](https://www.helius.dev/), [QuickNode](https://www.quicknode.com/), or [Alchemy](https://www.alchemy.com/))

### Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/meteora-liq-tracker.git
cd meteora-liq-tracker
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your RPC URL:

```
RPC_URL=https://your-solana-rpc-url.com
```

4. Start the dev server:

```bash
npm run dev
```

5. Open `http://localhost:3000/pool/<pool-address>` with any Meteora DLMM pool address.

Example: `http://localhost:3000/pool/5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6`

## Project Structure

```
app/
  api/
    pool/[poolAddress]/route.ts   # Fetches on-chain bin data via DLMM SDK + token info from Jupiter
    chart/route.ts                # Proxies Jupiter chart API for candlestick data
  lib/
    types.ts                      # Shared TypeScript interfaces (PoolData, BinData, TokenInfo)
    jupiter.ts                    # Jupiter Data API client
    format.ts                     # Number/price formatting utilities
  pool/[poolAddress]/
    page.tsx                      # Main pool page — orchestrates data fetching and refresh logic
    components/
      PoolHeader.tsx              # Token cards, pool metadata, active price, external links
      PriceChart.tsx              # TradingView candlestick chart with auto-refresh
      LiquidityChart.tsx          # USD-scaled horizontal bar chart of bin liquidity
```

## Deployment

Deploy to Vercel with one click — just set the `RPC_URL` environment variable in your project settings.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/meteora-liq-tracker&env=RPC_URL&envDescription=Solana%20RPC%20URL%20for%20fetching%20on-chain%20pool%20data)

## License

MIT
