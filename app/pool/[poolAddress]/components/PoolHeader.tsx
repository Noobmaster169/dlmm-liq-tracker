"use client";

import { useState } from "react";
import { PoolData, TokenInfo } from "@/app/lib/types";
import { formatUsd } from "@/app/lib/format";
import {
  BadgeCheck,
  Leaf,
  Copy,
  Check,
  Globe,
  ExternalLink,
} from "lucide-react";

function OrganicScoreBadge({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const color =
    label === "high"
      ? "text-emerald-400"
      : label === "medium"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Leaf size={14} />
      <span className="font-medium">Score: {score.toFixed(2)}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function CopyableAddress({
  address,
  truncate = false,
  className = "",
}: {
  address: string;
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const display = truncate
    ? address.slice(0, 6) + "..." + address.slice(-6)
    : address;

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 font-mono hover:text-gray-200 transition-colors cursor-pointer ${className}`}
      title="Copy to clipboard"
    >
      <span className="break-all text-left">{display}</span>
      {copied ? (
        <Check size={14} className="shrink-0 text-emerald-400" />
      ) : (
        <Copy size={14} className="shrink-0 opacity-40" />
      )}
    </button>
  );
}

function TokenCard({ token }: { token: TokenInfo }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      {/* Top row: icon + name + verified */}
      <div className="flex items-center gap-2.5 mb-3">
        {token.icon && (
          <img src={token.icon} alt="" className="w-8 h-8 rounded-full" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-lg leading-tight">
              {token.symbol}
            </span>
            {token.isVerified && (
              <BadgeCheck
                size={18}
                className="shrink-0 text-blue-400 fill-blue-400 stroke-white"
              />
            )}
          </div>
          <div className="text-gray-500 text-xs">{token.name}</div>
        </div>
      </div>

      {/* Contract address */}
      <div className="mb-3">
        <CopyableAddress
          address={token.mint}
          truncate
          className="text-sm text-gray-400"
        />
      </div>

      {/* Organic score */}
      {token.organicScore != null && token.organicScoreLabel != null && (
        <div className="mb-3">
          <OrganicScoreBadge
            score={token.organicScore}
            label={token.organicScoreLabel}
          />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {token.usdPrice != null && (
          <div>
            <span className="text-gray-500">Price </span>
            <span className="font-mono">
              $
              {token.usdPrice < 0.01
                ? token.usdPrice.toPrecision(3)
                : token.usdPrice.toFixed(2)}
            </span>
          </div>
        )}
        {token.mcap != null && (
          <div>
            <span className="text-gray-500">MCap </span>
            <span className="font-mono">{formatUsd(token.mcap)}</span>
          </div>
        )}
        {token.liquidity != null && (
          <div>
            <span className="text-gray-500">Liq </span>
            <span className="font-mono">{formatUsd(token.liquidity)}</span>
          </div>
        )}
        {token.holderCount != null && (
          <div>
            <span className="text-gray-500">Holders </span>
            <span className="font-mono">
              {token.holderCount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Links */}
      {(token.website || token.twitter) && (
        <div className="flex gap-3 mt-3 text-xs">
          {token.website && (
            <a
              href={token.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:underline"
            >
              <Globe size={12} />
              Website
            </a>
          )}
          {token.twitter && (
            <a
              href={token.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:underline"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function formatUsdPrice(price: number): string {
  if (price < 0.0001) return "$" + price.toPrecision(2);
  if (price < 0.01) return "$" + price.toPrecision(3);
  if (price < 1) return "$" + price.toFixed(4);
  return "$" + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function PoolHeader({ pool }: { pool: PoolData }) {
  const activeBin = pool.bins.find((b) => b.isActiveBin);
  const activePrice = activeBin ? Number(activeBin.pricePerToken) : null;

  const tokenXUsd = pool.tokenX.usdPrice;

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold mb-2">
        {pool.tokenX.symbol} / {pool.tokenY.symbol}
      </h1>

      {/* Pool address — full, prominent */}
      <div className="mb-2">
        <CopyableAddress
          address={pool.poolAddress}
          className="text-sm text-gray-400"
        />
      </div>

      {/* Open in Meteora */}
      <div className="mb-5">
        <a
          href={`https://www.meteora.ag/dlmm/${pool.poolAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ExternalLink size={13} />
          Open in Meteora
        </a>
      </div>

      {/* Token cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <TokenCard token={pool.tokenX} />
        <TokenCard token={pool.tokenY} />
      </div>

      {/* Pool info row */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-gray-500 text-xs">Bin Step</div>
          <div className="font-mono font-medium mt-0.5">{pool.binStep}</div>
        </div>
        {activeBin && activePrice != null && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-gray-500 text-xs">
              Active Price
              <span className="text-gray-600">
                {" "}
                (in {pool.tokenY.symbol})
              </span>
            </div>
            <div className="font-mono font-medium mt-0.5">
              {activePrice.toFixed(6)} {pool.tokenY.symbol}
            </div>
            {tokenXUsd != null && (
              <div className="text-gray-500 text-xs font-mono mt-0.5">
                1 {pool.tokenX.symbol} = {formatUsdPrice(tokenXUsd)}
              </div>
            )}
            <div className="text-gray-600 text-[10px] font-mono mt-0.5">
              Bin #{activeBin.binId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
