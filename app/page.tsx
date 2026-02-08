"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Zap, Search, ExternalLink } from "lucide-react";

const DEMO_POOL = "5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Full-Range Bin Liquidity",
    description:
      "Visualize every bin across the entire pool — not just around the active price. USD-normalized stacked bars reveal the true liquidity landscape.",
  },
  {
    icon: Zap,
    title: "Real-Time Price Chart",
    description:
      "TradingView-style candlestick chart with OHLCV data, volume histogram, and auto-refreshing prices across multiple timeframes.",
  },
  {
    icon: Search,
    title: "Token Intelligence",
    description:
      "Detailed token metadata from Jupiter — price, market cap, liquidity, holder count, organic score, and verification status.",
  },
];

export default function Home() {
  const [address, setAddress] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed) {
      router.push(`/pool/${trimmed}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-2xl w-full text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built for Solana DLMM LPs
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Meteora Liquidity
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Tracker
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-lg mx-auto mb-10">
            Monitor bin allocations across any Meteora DLMM pool. Spot
            liquidity gaps, understand concentration zones, and make
            smarter LP decisions.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-2 max-w-xl mx-auto">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter a DLMM pool address..."
                className="flex-1 h-12 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
              />
              <button
                type="submit"
                className="h-12 px-5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
              >
                Track
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Test It Out */}
          <a
            href={`/pool/${DEMO_POOL}`}
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
          >
            <ExternalLink size={14} />
            Test It Out with a live pool
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                <f.icon size={18} className="text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span>Meteora DLMM Liquidity Tracker</span>
          <div className="flex items-center gap-4">
            <a
              href="https://www.meteora.ag/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              Meteora
            </a>
            <a
              href="https://jup.ag/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              Jupiter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
