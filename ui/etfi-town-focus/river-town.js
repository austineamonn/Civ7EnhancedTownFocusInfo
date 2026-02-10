// River (River Feature → Food) details renderer.
// - +2,+3,+4 Food per River tile (city center + purchased).
// - Shows total Food, total River tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getFeatureSummaryForSet, renderImprovementDetailsHTML }  from "../../etfi-utilities.js";

export default class RiverDetails {
  render(city) {
      const summary = getFeatureSummaryForSet({
        city,
        baseMultiplier: 2, // your rule
        targetFeature: "RIVER"
      });
      if (!summary) return null;
      return renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
  }
}