// Plains (Plains Biome → Production) details renderer.
// - +2,+3,+4 Production per Plains tile (city center + purchased).
// - Shows total Production, total Plains tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getBiomeSummaryForSet, renderImprovementDetailsHTML }  from "../../etfi-utilities.js";

export default class PlainsDetails {
  render(city) {
      const summary = getBiomeSummaryForSet({
        city,
        baseMultiplier: 2, // your rule
        targetBiome: "BIOME_PLAINS"
      });
      if (!summary) return null;
      return renderImprovementDetailsHTML(summary, ETFI_YIELDS.PRODUCTION);
  }
}