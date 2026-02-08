"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  Time,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
} from "lightweight-charts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVALS = [
  { label: "5m", value: "5_MINUTE", candles: 700 },
  { label: "15m", value: "15_MINUTE", candles: 700 },
  { label: "1H", value: "1_HOUR", candles: 700 },
  { label: "4H", value: "4_HOUR", candles: 700 },
  { label: "1D", value: "1_DAY", candles: 365 },
  { label: "1W", value: "1_WEEK", candles: 200 },
];

const REFRESH_MS = 10_000; // 10-second auto-refresh

/** Auto-detect the right number of decimal places for the price axis */
function detectPrecision(candles: Candle[]): number {
  if (candles.length === 0) return 2;
  const mid =
    candles.reduce((s, c) => s + c.close, 0) / candles.length;
  if (mid >= 1000) return 2;
  if (mid >= 1) return 4;
  if (mid >= 0.01) return 6;
  if (mid >= 0.0001) return 8;
  return 10;
}

function formatPrice(price: number, precision: number): string {
  return "$" + price.toFixed(precision);
}

function formatVolume(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(0);
}

export function PriceChart({
  mint,
  symbol,
  binStep,
  activeUsdPrice,
  onBinChange,
}: {
  mint: string;
  symbol: string;
  binStep: number;
  activeUsdPrice: number | null;
  onBinChange?: () => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [interval, setIntervalValue] = useState("5_MINUTE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);
  const candleMapRef = useRef(new Map<number, Candle>());
  const precisionRef = useRef(2);
  const fitContentRef = useRef(true);
  const activeUsdPriceRef = useRef(activeUsdPrice);

  useEffect(() => {
    activeUsdPriceRef.current = activeUsdPrice;
  }, [activeUsdPrice]);

  const selectedInterval = INTERVALS.find((i) => i.value === interval)!;
  const precision = detectPrecision(candles);
  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const displayCandle = hoveredCandle ?? latestCandle;

  // ── Chart creation (once on mount) ──────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      width: container.clientWidth,
      height: 400,
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#374151",
        },
        vertLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#374151",
        },
      },
      localization: {
        priceFormatter: (price: number) =>
          price.toFixed(precisionRef.current),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: precisionRef.current,
        minMove: 1 / 10 ** precisionRef.current,
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Crosshair — reads from candleMapRef so it always sees latest data
    chart.subscribeCrosshairMove(
      (param: { time?: Time }) => {
        if (!param.time) {
          setHoveredCandle(null);
          return;
        }
        const c = candleMapRef.current.get(param.time as number);
        setHoveredCandle(c ?? null);
      }
    );

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data fetching with 20 s auto-refresh ────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchChart(showLoading: boolean) {
      try {
        if (showLoading) {
          setLoading(true);
          setError(null);
        }
        const res = await fetch(
          `/api/chart?mint=${mint}&interval=${interval}&candles=${selectedInterval.candles}&quote=usd`
        );
        if (!res.ok) throw new Error("Failed to fetch chart");
        const data = await res.json();
        if (!cancelled) {
          setCandles(data.candles ?? []);
        }
      } catch (err) {
        if (!cancelled && showLoading) {
          setError(err instanceof Error ? err.message : "Chart error");
        }
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    }

    fitContentRef.current = true; // fit content on interval change / first load
    fetchChart(true);
    const timer = window.setInterval(() => fetchChart(false), REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mint, interval, selectedInterval.candles]);

  // ── Update chart series data in-place (no chart recreation) ─────
  useEffect(() => {
    if (
      !chartRef.current ||
      !candleSeriesRef.current ||
      !volumeSeriesRef.current ||
      candles.length === 0
    )
      return;

    // Update precision if it changed
    const newPrecision = detectPrecision(candles);
    if (newPrecision !== precisionRef.current) {
      precisionRef.current = newPrecision;
      chartRef.current.applyOptions({
        localization: {
          priceFormatter: (price: number) => price.toFixed(newPrecision),
        },
      });
      candleSeriesRef.current.applyOptions({
        priceFormat: {
          type: "price",
          precision: newPrecision,
          minMove: 1 / 10 ** newPrecision,
        },
      });
    }

    // Push candle data
    candleSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // Push volume data
    volumeSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color:
          c.close >= c.open
            ? "rgba(34,197,94,0.3)"
            : "rgba(239,68,68,0.3)",
      }))
    );

    // Update crosshair lookup
    const newMap = new Map<number, Candle>();
    for (const c of candles) newMap.set(c.time, c);
    candleMapRef.current = newMap;

    // Fit content only on interval change / first load
    if (fitContentRef.current) {
      chartRef.current.timeScale().fitContent();
      fitContentRef.current = false;
    }

    // ── Bin change detection ──
    const refPrice = activeUsdPriceRef.current;
    if (refPrice && binStep > 0) {
      const latestClose = candles[candles.length - 1].close;
      const pctChange = Math.abs(latestClose - refPrice) / refPrice;
      const binThreshold = binStep / 10_000; // binStep is in basis points of 0.01%
      if (pctChange >= binThreshold) {
        onBinChange?.();
      }
    }
  }, [candles, binStep, onBinChange]);

  return (
    <div className="mb-6">
      {/* Header: title + interval buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">
          {symbol} Price
          <span className="text-gray-500 text-xs ml-1.5">(USD)</span>
        </div>
        <div className="flex gap-1">
          {INTERVALS.map((i) => (
            <button
              key={i.value}
              onClick={() => setIntervalValue(i.value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                interval === i.value
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {/* OHLCV legend bar */}
        {displayCandle && (
          <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] font-mono border-b border-white/5">
            {(() => {
              const up = displayCandle.close >= displayCandle.open;
              const color = up ? "text-emerald-400" : "text-red-400";
              return (
                <>
                  <span className="text-gray-500">O</span>
                  <span className={color}>
                    {formatPrice(displayCandle.open, precision)}
                  </span>
                  <span className="text-gray-500">H</span>
                  <span className={color}>
                    {formatPrice(displayCandle.high, precision)}
                  </span>
                  <span className="text-gray-500">L</span>
                  <span className={color}>
                    {formatPrice(displayCandle.low, precision)}
                  </span>
                  <span className="text-gray-500">C</span>
                  <span className={color}>
                    {formatPrice(displayCandle.close, precision)}
                  </span>
                  <span className="text-gray-500">Vol</span>
                  <span className="text-gray-400">
                    {formatVolume(displayCandle.volume)}
                  </span>
                </>
              );
            })()}
          </div>
        )}

        {/* Chart area */}
        <div className="p-2">
          <div className="relative h-[400px]">
            {/* Always-mounted container so the chart instance persists */}
            <div
              ref={chartContainerRef}
              className="absolute inset-0"
              style={{
                opacity: candles.length > 0 && !error ? 1 : 0,
              }}
            />
            {/* Overlay states */}
            {loading && candles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                Loading chart...
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
                {error}
              </div>
            )}
            {!loading && !error && candles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                No price data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
