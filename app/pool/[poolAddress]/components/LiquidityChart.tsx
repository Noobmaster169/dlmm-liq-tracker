"use client";

import { useMemo, useState } from "react";
import { BinData, PoolData } from "@/app/lib/types";
import {
  formatFullAmount,
  formatPriceMovement,
  formatUsd,
} from "@/app/lib/format";

type ChartRow =
  | { type: "bin"; bin: BinData }
  | { type: "gap"; fromBinId: number; toBinId: number; count: number };

function useChartData(
  pool: PoolData,
  rangeLow: number,
  rangeHigh: number
) {
  return useMemo(() => {
    const allBins = pool.bins ?? [];
    const activeBin = allBins.find((b) => b.isActiveBin);
    const activePrice = activeBin ? Number(activeBin.pricePerToken) : 0;

    const xUsdPrice = pool.tokenX.usdPrice ?? 0;
    const yUsdPrice = pool.tokenY.usdPrice ?? 0;

    const empty = {
      rows: [] as ChartRow[],
      maxUsdTotal: 1,
      activePrice,
      visibleBins: 0,
      gapBins: 0,
    };

    if (allBins.length === 0) return empty;
    if (!Number.isFinite(rangeLow) || !Number.isFinite(rangeHigh)) return empty;
    if (rangeLow > rangeHigh) return empty;

    const liquidBins = allBins
      .filter((b) => {
        const hasLiquidity =
          b.xAmountDecimal > 0 || b.yAmountDecimal > 0 || b.isActiveBin;
        if (!hasLiquidity) return false;

        if (activePrice <= 0) return true;

        const binPrice = Number(b.pricePerToken);
        if (!Number.isFinite(binPrice) || binPrice <= 0) return false;

        const movePct = ((binPrice - activePrice) / activePrice) * 100;
        return movePct >= rangeLow && movePct <= rangeHigh;
      })
      .sort((a, b) => a.binId - b.binId);

    if (liquidBins.length === 0) return empty;

    // Scale bars by USD value so different-priced tokens are comparable
    const maxUsdTotal = Math.max(
      ...liquidBins.map(
        (b) => b.xAmountDecimal * xUsdPrice + b.yAmountDecimal * yUsdPrice
      ),
      0.01
    );

    const rows: ChartRow[] = [];
    let gapBins = 0;
    for (let i = 0; i < liquidBins.length; i++) {
      if (i > 0) {
        const gap = liquidBins[i].binId - liquidBins[i - 1].binId - 1;
        if (gap > 0) {
          gapBins += gap;
          rows.push({
            type: "gap",
            fromBinId: liquidBins[i - 1].binId + 1,
            toBinId: liquidBins[i].binId - 1,
            count: gap,
          });
        }
      }
      rows.push({ type: "bin", bin: liquidBins[i] });
    }

    return {
      rows,
      maxUsdTotal,
      activePrice,
      visibleBins: liquidBins.length,
      gapBins,
    };
  }, [pool, rangeLow, rangeHigh]);
}

/** Compute the full % range of all liquid bins relative to active price */
function useFullRange(pool: PoolData) {
  return useMemo(() => {
    const bins = pool.bins ?? [];
    const activeBin = bins.find((b) => b.isActiveBin);
    const activePrice = activeBin ? Number(activeBin.pricePerToken) : 0;
    if (activePrice <= 0 || bins.length === 0)
      return { fullLow: -99, fullHigh: 1000 };

    let min = 0;
    let max = 0;
    for (const b of bins) {
      if (b.xAmountDecimal <= 0 && b.yAmountDecimal <= 0 && !b.isActiveBin)
        continue;
      const binPrice = Number(b.pricePerToken);
      if (!Number.isFinite(binPrice) || binPrice <= 0) continue;
      const movePct = ((binPrice - activePrice) / activePrice) * 100;
      if (movePct < min) min = movePct;
      if (movePct > max) max = movePct;
    }

    return {
      fullLow: Math.floor(min),
      fullHigh: Math.ceil(max),
    };
  }, [pool]);
}

function BinRow({
  bin,
  maxUsdTotal,
  activePrice,
  tokenXSymbol,
  tokenYSymbol,
  xUsdPrice,
  yUsdPrice,
}: {
  bin: BinData;
  maxUsdTotal: number;
  activePrice: number;
  tokenXSymbol: string;
  tokenYSymbol: string;
  xUsdPrice: number;
  yUsdPrice: number;
}) {
  const xUsd = bin.xAmountDecimal * xUsdPrice;
  const yUsd = bin.yAmountDecimal * yUsdPrice;
  const totalUsd = xUsd + yUsd;

  const totalPct = (totalUsd / maxUsdTotal) * 100;
  const xPct = totalUsd > 0 ? (xUsd / totalUsd) * 100 : 0;

  const binPrice = Number(bin.pricePerToken);
  const movePct =
    activePrice > 0 ? ((binPrice - activePrice) / activePrice) * 100 : 0;

  return (
    <div
      className={`group grid grid-cols-[56px_1fr_72px_64px] items-center h-[18px] gap-x-2 ${
        bin.isActiveBin ? "bg-yellow-400/10" : ""
      }`}
    >
      <div
        className={`text-[10px] font-mono tabular-nums ${
          bin.isActiveBin ? "text-yellow-400 font-bold" : "text-gray-600"
        }`}
      >
        {bin.binId}
      </div>

      <div className="relative h-3.5">
        <div
          className="absolute inset-y-0 left-0 flex rounded-sm overflow-hidden"
          style={{ width: `${totalPct}%`, minWidth: totalPct > 0 ? 2 : 0 }}
        >
          <div
            className={bin.isActiveBin ? "bg-blue-400" : "bg-blue-500/80"}
            style={{ width: `${xPct}%` }}
          />
          <div
            className={
              bin.isActiveBin ? "bg-emerald-400" : "bg-emerald-500/80"
            }
            style={{ width: `${100 - xPct}%` }}
          />
        </div>

        {/* Tooltip */}
        <div className="pointer-events-none absolute left-0 -top-10 z-10 hidden group-hover:block bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-[10px] text-gray-200 font-mono whitespace-nowrap shadow-lg">
          <div>
            {tokenXSymbol}: {formatFullAmount(bin.xAmountDecimal)}
            {xUsdPrice > 0 && (
              <span className="text-gray-400"> ({formatUsd(xUsd)})</span>
            )}
          </div>
          <div>
            {tokenYSymbol}: {formatFullAmount(bin.yAmountDecimal)}
            {yUsdPrice > 0 && (
              <span className="text-gray-400"> ({formatUsd(yUsd)})</span>
            )}
          </div>
          {totalUsd > 0 && (
            <div className="text-gray-400 border-t border-gray-700 mt-0.5 pt-0.5">
              Bin TVL: {formatUsd(totalUsd)}
            </div>
          )}
        </div>
      </div>

      <div
        className={`text-right text-[10px] font-mono tabular-nums truncate ${
          bin.isActiveBin ? "text-yellow-400 font-semibold" : "text-gray-500"
        }`}
      >
        {binPrice.toFixed(6)}
      </div>

      <div
        className={`text-right text-[10px] font-mono tabular-nums ${
          bin.isActiveBin
            ? "text-yellow-400"
            : movePct > 0
              ? "text-emerald-400"
              : movePct < 0
                ? "text-red-400"
                : "text-gray-600"
        }`}
      >
        {bin.isActiveBin ? "active" : formatPriceMovement(movePct)}
      </div>
    </div>
  );
}

function GapRow({
  fromBinId,
  toBinId,
  count,
}: {
  fromBinId: number;
  toBinId: number;
  count: number;
}) {
  return (
    <div className="flex items-center h-6 my-0.5 bg-red-500/5 border border-red-500/20 border-dashed rounded">
      <div className="w-full text-center text-[10px] text-red-400 font-mono">
        {count} empty bin{count > 1 ? "s" : ""} ({fromBinId} &rarr; {toBinId})
      </div>
    </div>
  );
}

const MIN_OPTIONS = [
  { label: "-1%", value: -1 },
  { label: "-5%", value: -5 },
  { label: "-10%", value: -10 },
  { label: "-25%", value: -25 },
  { label: "-50%", value: -50 },
  { label: "-75%", value: -75 },
  { label: "-99%", value: -99 },
];

const MAX_OPTIONS = [
  { label: "+1%", value: 1 },
  { label: "+5%", value: 5 },
  { label: "+10%", value: 10 },
  { label: "+25%", value: 25 },
  { label: "+50%", value: 50 },
  { label: "+100%", value: 100 },
  { label: "+250%", value: 250 },
  { label: "+500%", value: 500 },
  { label: "+1000%", value: 1000 },
];

function RangeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
        active
          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
          : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

export function LiquidityChart({ pool }: { pool: PoolData }) {
  const { fullLow, fullHigh } = useFullRange(pool);

  const [rangeLow, setRangeLow] = useState(fullLow);
  const [rangeHigh, setRangeHigh] = useState(fullHigh);

  const isFullRange = rangeLow <= fullLow && rangeHigh >= fullHigh;
  const isMinFull = rangeLow <= fullLow;
  const isMaxFull = rangeHigh >= fullHigh;

  const xUsdPrice = pool.tokenX.usdPrice ?? 0;
  const yUsdPrice = pool.tokenY.usdPrice ?? 0;

  const { rows, maxUsdTotal, activePrice, visibleBins, gapBins } =
    useChartData(pool, rangeLow, rangeHigh);

  return (
    <>
      {/* Range filter */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-400">
            Price Range from Active Bin
          </div>
          <button
            onClick={() => {
              setRangeLow(fullLow);
              setRangeHigh(fullHigh);
            }}
            className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${
              isFullRange
                ? "text-blue-400 bg-blue-500/20 border border-blue-500/40"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Full Range
          </button>
        </div>

        {/* Min range */}
        <div className="mb-2.5">
          <div className="text-[10px] text-gray-500 mb-1.5">
            Min (price drop)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <RangeButton
              label="All"
              active={isMinFull}
              onClick={() => setRangeLow(fullLow)}
            />
            {MIN_OPTIONS.map((o) => (
              <RangeButton
                key={o.value}
                label={o.label}
                active={!isMinFull && rangeLow === o.value}
                onClick={() => setRangeLow(o.value)}
              />
            ))}
          </div>
        </div>

        {/* Max range */}
        <div>
          <div className="text-[10px] text-gray-500 mb-1.5">
            Max (price increase)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <RangeButton
              label="All"
              active={isMaxFull}
              onClick={() => setRangeHigh(fullHigh)}
            />
            {MAX_OPTIONS.map((o) => (
              <RangeButton
                key={o.value}
                label={o.label}
                active={!isMaxFull && rangeHigh === o.value}
                onClick={() => setRangeHigh(o.value)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="text-gray-500">
          {visibleBins} bins{!isFullRange && " in range"}
        </span>
        {gapBins > 0 && (
          <span className="text-red-400">{gapBins} empty gaps</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span>{pool.tokenX.symbol}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>{pool.tokenY.symbol}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2.5 rounded-sm border-2 border-yellow-400" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50 border-dashed" />
          <span className="text-red-400">Gap</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[56px_1fr_72px_64px] items-center text-[10px] text-gray-500 mb-1 gap-x-2">
            <div>Bin</div>
            <div>Liquidity (USD value)</div>
            <div className="text-right">Price</div>
            <div className="text-right">Move %</div>
          </div>

          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-600">
              No bins with liquidity in this range
            </div>
          ) : (
            rows.map((row) =>
              row.type === "gap" ? (
                <GapRow key={`g-${row.fromBinId}`} {...row} />
              ) : (
                <BinRow
                  key={row.bin.binId}
                  bin={row.bin}
                  maxUsdTotal={maxUsdTotal}
                  activePrice={activePrice}
                  tokenXSymbol={pool.tokenX.symbol}
                  tokenYSymbol={pool.tokenY.symbol}
                  xUsdPrice={xUsdPrice}
                  yUsdPrice={yUsdPrice}
                />
              )
            )
          )}
        </div>
      </div>

      <div className="mt-3 text-[10px] text-gray-600">
        {pool.bins.length} total bins fetched
      </div>
    </>
  );
}
