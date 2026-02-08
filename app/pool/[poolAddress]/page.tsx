"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { PoolData } from "@/app/lib/types";
import { PoolHeader } from "./components/PoolHeader";
import { LiquidityChart } from "./components/LiquidityChart";
import { PriceChart } from "./components/PriceChart";

const POOL_REFETCH_COOLDOWN = 30_000; // 30 seconds

export default function PoolPage({
  params,
}: {
  params: Promise<{ poolAddress: string }>;
}) {
  const { poolAddress } = use(params);
  const [pool, setPool] = useState<PoolData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPoolFetchRef = useRef(0);

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch(`/api/pool/${poolAddress}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to fetch pool");
      }
      const data = await res.json();
      setPool(data);
      lastPoolFetchRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [poolAddress]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  // Re-fetch pool data only if ≥2 min have passed since last fetch
  const handleBinChange = useCallback(() => {
    const now = Date.now();
    if (now - lastPoolFetchRef.current >= POOL_REFETCH_COOLDOWN) {
      fetchPool();
    }
  }, [fetchPool]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-400">Loading pool data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-red-400">Error: {error}</span>
      </div>
    );
  }

  if (!pool) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 max-w-5xl mx-auto">
      <PoolHeader pool={pool} />
      <PriceChart
        mint={pool.tokenX.mint}
        symbol={pool.tokenX.symbol}
        binStep={pool.binStep}
        activeUsdPrice={pool.tokenX.usdPrice}
        onBinChange={handleBinChange}
      />
      <LiquidityChart pool={pool} />
    </div>
  );
}
