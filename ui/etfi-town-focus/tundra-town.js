// Tundra (Tundra Biome → Culture) details renderer.
// - +1,+1,+2 Culture per Tundra tile (city center + purchased).
// - Shows total Culture, total Tundra tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getBiomeSummaryForSet, renderImprovementDetailsHTML }  from "../../etfi-utilities.js";

export default class TundraDetails {
  render(city) {
      const summary = getBiomeSummaryForSet({
        city,
        baseMultiplier: 1, // your rule
        targetBiome: "BIOME_TUNDRA"
      });
      if (!summary) return null;
      return renderImprovementDetailsHTML(summary, ETFI_YIELDS.CULTURE);
  }
}