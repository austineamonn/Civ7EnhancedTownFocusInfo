// Farming/Fishing: shared improvement-set logic + generic renderer.

const ETFI_IMPROVEMENTS = {
  displayNames: {
    IMPROVEMENT_FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FISHING_BOAT_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FARM: "LOC_MOD_ETFI_IMPROVEMENT_FARM",
    IMPROVEMENT_PASTURE: "LOC_MOD_ETFI_IMPROVEMENT_PASTURE",
    IMPROVEMENT_PLANTATION: "LOC_MOD_ETFI_IMPROVEMENT_PLANTATION",
  },
  sets: {
    food: new Set([
      "IMPROVEMENT_FARM",
      "IMPROVEMENT_PASTURE",
      "IMPROVEMENT_PLANTATION",
      "IMPROVEMENT_FISHING_BOAT",
      "IMPROVEMENT_FISHING_BOAT_RESOURCE",
    ]),
  },
};

export default class FoodFocusDetails {
  render(city) {
    const summary = buildImprovementSetSummary(city, {
      targetSet: ETFI_IMPROVEMENTS.sets.food,
      displayNames: ETFI_IMPROVEMENTS.displayNames,
      baseMultiplier: 1,
    });
    if (!summary) return null;

    return renderImprovementSummaryHTML(summary, {
      yieldIconId: ETFI_YIELDS.FOOD,
      totalLabelKey: "LOC_MOD_ETFI_TOTAL_IMPROVEMENTS",
    });
  }
}
