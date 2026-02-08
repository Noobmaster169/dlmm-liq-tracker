import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
import { fetchTokenInfos, JupiterAsset } from "@/app/lib/jupiter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poolAddress: string }> }
) {
  const { poolAddress } = await params;

  if (!process.env.RPC_URL) {
    return NextResponse.json(
      { error: "RPC_URL not configured in .env" },
      { status: 500 }
    );
  }

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(poolAddress);
  } catch {
    return NextResponse.json(
      { error: "Invalid pool address" },
      { status: 400 }
    );
  }

  try {
    const connection = new Connection(process.env.RPC_URL);
    const dlmmPool = await DLMM.create(connection, pubkey);

    const tokenXMint = dlmmPool.tokenX.mint.address.toBase58();
    const tokenYMint = dlmmPool.tokenY.mint.address.toBase58();
    const tokenXDecimals = dlmmPool.tokenX.mint.decimals;
    const tokenYDecimals = dlmmPool.tokenY.mint.decimals;

    // Fetch on-chain data and Jupiter metadata in parallel
    const [activeBinData, binArrays, jupTokens] = await Promise.all([
      dlmmPool.getActiveBin(),
      dlmmPool.getBinArrays(),
      fetchTokenInfos([tokenXMint, tokenYMint]),
    ]);

    const activeBinId = activeBinData.binId;
    const jupX = jupTokens.get(tokenXMint);
    const jupY = jupTokens.get(tokenYMint);

    const makeTokenInfo = (
      mint: string,
      decimals: number,
      jup?: JupiterAsset
    ) => ({
      mint,
      decimals,
      symbol: jup?.symbol ?? mint.slice(0, 4),
      name: jup?.name ?? "Unknown",
      icon: jup?.icon ?? "",
      usdPrice: jup?.usdPrice ?? null,
      mcap: jup?.mcap ?? null,
      liquidity: jup?.liquidity ?? null,
      holderCount: jup?.holderCount ?? null,
      website: jup?.website ?? null,
      twitter: jup?.twitter ?? null,
      organicScore: jup?.organicScore ?? null,
      organicScoreLabel: jup?.organicScoreLabel ?? null,
      isVerified: jup?.isVerified ?? false,
    });

    if (binArrays.length === 0) {
      return NextResponse.json({
        poolAddress,
        activeBinId,
        binStep: dlmmPool.lbPair.binStep,
        tokenX: makeTokenInfo(tokenXMint, tokenXDecimals, jupX),
        tokenY: makeTokenInfo(tokenYMint, tokenYDecimals, jupY),
        bins: [],
      });
    }

    const BINS_PER_ARRAY = 70;
    const indexes = binArrays.map((ba) => ba.account.index.toNumber());
    const minIndex = Math.min(...indexes);
    const maxIndex = Math.max(...indexes);
    const lowerBinId = minIndex * BINS_PER_ARRAY;
    const upperBinId = (maxIndex + 1) * BINS_PER_ARRAY - 1;

    const { bins } = await dlmmPool.getBinsBetweenLowerAndUpperBound(
      lowerBinId,
      upperBinId
    );

    const binsResponse = bins.map((bin) => ({
      binId: bin.binId,
      xAmount: bin.xAmount.toString(),
      yAmount: bin.yAmount.toString(),
      xAmountDecimal:
        Number(bin.xAmount.toString()) / 10 ** tokenXDecimals,
      yAmountDecimal:
        Number(bin.yAmount.toString()) / 10 ** tokenYDecimals,
      price: bin.price,
      pricePerToken: bin.pricePerToken,
      supply: bin.supply.toString(),
      isActiveBin: bin.binId === activeBinId,
    }));

    return NextResponse.json({
      poolAddress,
      activeBinId,
      binStep: dlmmPool.lbPair.binStep,
      tokenX: makeTokenInfo(tokenXMint, tokenXDecimals, jupX),
      tokenY: makeTokenInfo(tokenYMint, tokenYDecimals, jupY),
      bins: binsResponse,
    });
  } catch (err) {
    console.error("Failed to fetch pool data:", err);
    return NextResponse.json(
      { error: "Failed to fetch pool data" },
      { status: 500 }
    );
  }
}
