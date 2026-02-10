// Lake (Lake Feature → Food + Culture) details renderer.
// - +1,+1,+2 Culture and +2,+3,+4 Food per Lake tile (city center + purchased).
// - Shows total Culture and Food, total Lake tiles, and improvement breakdown.
// Returns null if no resource tiles are found (caller can render +0 fallback).

import { ETFI_YIELDS, getFeatureSummaryForSet, renderImprovementDoubleYieldDetailsHTML }  from "../../etfi-utilities.js";

export default class LakeDetails {
  render(city) {
      const summary = getFeatureSummaryForSet({
        city,
        baseMultiplier: 1, // your rule
        targetFeature: "LAKE"
      });
      if (!summary) return null;
      return renderImprovementDoubleYieldDetailsHTML(summary, ETFI_YIELDS.FOOD, ETFI_YIELDS.CULTURE);
  }
}