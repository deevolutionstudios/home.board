import { useQuery } from "@tanstack/react-query";

// Bavarian public holidays: shops (incl. supermarkets) are closed by law.
// Source: Nager.Date (free, no key). Region is Bavaria (DE-BY).
const REGION = "DE-BY";

type NagerHoliday = { date: string; localName: string; name: string; global: boolean; counties: string[] | null; types: string[] };

async function fetchYear(year: number): Promise<NagerHoliday[]> {
  const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/DE`);
  if (!r.ok) return [];
  return r.json();
}

export function useHolidays() {
  const { data } = useQuery({
    queryKey: ["holidays", REGION],
    queryFn: async () => {
      const y = new Date().getFullYear();
      const all = (await Promise.all([fetchYear(y), fetchYear(y + 1)])).flat();
      const map: Record<string, string> = {};
      for (const h of all) {
        if (!h.types.includes("Public")) continue;
        if (h.global || h.counties?.includes(REGION)) map[h.date] = h.name;
      }
      return map;
    },
    staleTime: 12 * 60 * 60_000,
  });
  return data ?? {};
}
