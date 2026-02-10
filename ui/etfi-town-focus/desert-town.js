// Desert (Desert Biome → Gold) details renderer.
// - +2,+3,+4 Gold per Desert tile (city center + purchased).
// - Shows total Gold, total Desert tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getBiomeSummaryForSet, renderImprovementDetailsHTML }  from "../../etfi-utilities.js";

export default class DesertDetails {
  render(city) {
      const summary = getBiomeSummaryForSet({
        city,
        baseMultiplier: 2, // your rule
        targetBiome: "BIOME_DESERT"
      });
      if (!summary) return null;
      return renderImprovementDetailsHTML(summary, ETFI_YIELDS.GOLD);
  }
}