// Grassland (Grassland Biome → Food) details renderer.
// - +2,+3,+4 Food per Grassland tile (city center + purchased).
// - Shows total Food, total Grassland tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getBiomeSummaryForSet, renderImprovementDetailsHTML }  from "../../etfi-utilities.js";

export default class GrasslandDetails {
  render(city) {
      const summary = getBiomeSummaryForSet({
        city,
        baseMultiplier: 2, // your rule
        targetBiome: "BIOME_GRASSLAND"
      });
      if (!summary) return null;
      return renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
  }
}