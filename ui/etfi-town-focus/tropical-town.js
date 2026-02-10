// Tropical (Tropical Biome → Science) details renderer.
// - +1,+1,+2 Science per Tropical tile (city center + purchased).
// - Shows total Science, total Tropical tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getBiomeSummaryForSet, renderImprovementDetailsHTML }  from "../../etfi-utilities.js";

export default class TropicalDetails {
  render(city) {
      const summary = getBiomeSummaryForSet({
        city,
        baseMultiplier: 1, // your rule
        targetBiome: "BIOME_TROPICAL"
      });
      if (!summary) return null;
      return renderImprovementDetailsHTML(summary, ETFI_YIELDS.SCIENCE);
  }
}