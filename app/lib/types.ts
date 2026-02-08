export interface TokenInfo {
  mint: string;
  decimals: number;
  symbol: string;
  name: string;
  icon: string;
  usdPrice: number | null;
  mcap: number | null;
  liquidity: number | null;
  holderCount: number | null;
  website: string | null;
  twitter: string | null;
  organicScore: number | null;
  organicScoreLabel: string | null;
  isVerified: boolean;
}

export interface BinData {
  binId: number;
  xAmount: string;
  yAmount: string;
  xAmountDecimal: number;
  yAmountDecimal: number;
  price: string;
  pricePerToken: string;
  supply: string;
  isActiveBin: boolean;
}

export interface PoolData {
  poolAddress: string;
  activeBinId: number;
  binStep: number;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  bins: BinData[];
}
