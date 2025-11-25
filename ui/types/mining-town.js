// ui/production-chooser/details/mining-town.js (example path)

import { ETFI_YIELDS, getImprovementSummaryForSet, renderImprovementDetailsHTML } from "../../etfi-utilities.js";

// Mining / Production improvement configuration
const ETFI_IMPROVEMENTS = {
  displayNames: {
    IMPROVEMENT_CAMP: "LOC_MOD_ETFI_IMPROVEMENT_CAMP",
    IMPROVEMENT_WOODCUTTER: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
    IMPROVEMENT_WOODCUTTER_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
    IMPROVEMENT_CLAY_PIT: "LOC_MOD_ETFI_IMPROVEMENT_CLAY_PIT",
    IMPROVEMENT_MINE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
    IMPROVEMENT_MINE_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
    IMPROVEMENT_QUARRY: "LOC_MOD_ETFI_IMPROVEMENT_QUARRY",
  },
  sets: {
    production: new Set([
      "IMPROVEMENT_CAMP",
      "IMPROVEMENT_WOODCUTTER",
      "IMPROVEMENT_WOODCUTTER_RESOURCE",
      "IMPROVEMENT_CLAY_PIT",
      "IMPROVEMENT_MINE",
      "IMPROVEMENT_MINE_RESOURCE",
      "IMPROVEMENT_QUARRY",
    ]),
  },
};

export default class MiningDetails {
  /**
   * Returns HTML for Mining/Production focus, or null if no qualifying improvements.
   * Uses baseMultiplier = 2 per Mining rules.
   */
  render(city) {
    const summary = getImprovementSummaryForSet({
      city,
      targetSet: ETFI_IMPROVEMENTS.sets.production,
      displayNameMap: ETFI_IMPROVEMENTS.displayNames,
      baseMultiplier: 2, // Mining gets double era scaling
    });

    if (!summary) return null;
    return renderImprovementDetailsHTML(summary, ETFI_YIELDS.PRODUCTION);
  }
}
