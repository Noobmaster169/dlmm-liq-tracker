export interface JupiterAsset {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
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

export async function fetchTokenInfos(
  mints: string[]
): Promise<Map<string, JupiterAsset>> {
  const query = mints.join(",");
  const url = `https://datapi.jup.ag/v1/assets/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error("Jupiter API error:", res.status);
    return new Map();
  }

  const data: JupiterAsset[] = await res.json();
  const map = new Map<string, JupiterAsset>();
  for (const asset of data) {
    map.set(asset.id, asset);
  }
  return map;
}
