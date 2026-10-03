export type ParcelRegion = 'NE' | 'SE' | 'MW' | 'W';
export type ParcelTier = 1 | 2 | 3;

export interface CityCodeEntry {
  id: string;
  code: string;        // e.g. "BOS02110"
  region: ParcelRegion; // maps 1:1 to a bucket
  tier: ParcelTier;     // difficulty tier -> code length/complexity
}

export const REGIONS: { region: ParcelRegion; name: string }[] = [
  { region: 'NE', name: 'North East' },
  { region: 'SE', name: 'South East' },
  { region: 'MW', name: 'Midwest' },
  { region: 'W',  name: 'West' },
];

// [city code, ZIP] per region. Tiers are derived from these:
//   tier 1 = city code only ("BOS"), tier 2 = + ZIP prefix ("BOS02"), tier 3 = + full ZIP ("BOS02110")
const CITIES: Record<ParcelRegion, [string, string][]> = {
  NE: [['BOS', '02110'], ['NYC', '10001'], ['PHL', '19103'], ['PIT', '15222'], ['BUF', '14202'], ['PVD', '02903']],
  SE: [['ATL', '30303'], ['MIA', '33130'], ['CLT', '28202'], ['ORL', '32801'], ['NSH', '37203'], ['TPA', '33602']],
  MW: [['CHI', '60601'], ['DET', '48226'], ['MSP', '55401'], ['STL', '63101'], ['CLE', '44113'], ['KCY', '64105']],
  W:  [['LAX', '90012'], ['SEA', '98101'], ['SFO', '94103'], ['DEN', '80202'], ['PHX', '85004'], ['POR', '97204']],
};

function codeForTier(city: string, zip: string, tier: ParcelTier): string {
  if (tier === 1) return city;
  if (tier === 2) return city + zip.slice(0, 2);
  return city + zip;
}

export const POST_OFFICE_PARCELS: CityCodeEntry[] = ([1, 2, 3] as ParcelTier[]).flatMap((tier) =>
  REGIONS.flatMap(({ region }) =>
    CITIES[region].map(([city, zip]) => {
      const code = codeForTier(city, zip, tier);
      return { id: `${code.toLowerCase()}-t${tier}`, code, region, tier };
    }),
  ),
);

export function parcelsForTier(tier: ParcelTier): CityCodeEntry[] {
  return POST_OFFICE_PARCELS.filter((p) => p.tier === tier);
}
