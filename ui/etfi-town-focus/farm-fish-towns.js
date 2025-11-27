import { ETFI_YIELDS, getImprovementSummaryForSet, renderImprovementDetailsHTML } from "../../etfi-utilities.js";

const FOOD_IMPROVEMENTS = {
  displayNames: {
    IMPROVEMENT_FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FISHING_BOAT_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FARM: "LOC_MOD_ETFI_IMPROVEMENT_FARM",
    IMPROVEMENT_PASTURE: "LOC_MOD_ETFI_IMPROVEMENT_PASTURE",
    IMPROVEMENT_PLANTATION: "LOC_MOD_ETFI_IMPROVEMENT_PLANTATION",
  },
  set: new Set([
    "IMPROVEMENT_FARM",
    "IMPROVEMENT_PASTURE",
    "IMPROVEMENT_PLANTATION",
    "IMPROVEMENT_FISHING_BOAT",
    "IMPROVEMENT_FISHING_BOAT_RESOURCE",
  ]),
};

export default class FoodFocusDetails {
  render(city) {
    const summary = getImprovementSummaryForSet({
      city,
      targetSet: FOOD_IMPROVEMENTS.set,
      displayNameMap: FOOD_IMPROVEMENTS.displayNames,
      baseMultiplier: 1, // your rule
    });
    if (!summary) return null;
    return renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
  }
}
