// ui/production-chooser/details/food-details.js
//
// Standalone helpers & constants for Food/Fishing details.
// (Kept local to avoid broad refactors while we migrate one detail at a time.)

//import { renderEtfiPolicyBonusYieldsHTML } from "../../modifiers/etfi-policy-bonus-yields.js";

const ETFI_YIELDS = {
  FOOD: "YIELD_FOOD",
};

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

function getEraMultiplier(base = 1) {
  let multiplier = base;
  const ageData = GameInfo.Ages.lookup(Game.age);
  if (!ageData) return multiplier;
  const ageType = (ageData.AgeType || "").trim();
  if (ageType === "AGE_EXPLORATION") multiplier += 1;
  else if (ageType === "AGE_MODERN") multiplier += 2;
  return multiplier;
}

function renderHeaderBadge(iconId, value) {
  return `
    <div 
      class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2"
      style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
    >
      <fxs-icon data-icon-id="${iconId}" class="size-5"></fxs-icon>
      <span class="font-semibold">+${value}</span>
    </div>
  `;
}

function getImprovementSummaryForSet(city, targetSet, baseMultiplier = 1) {
  if (!city || !city.Constructibles) return null;
  if (!(targetSet instanceof Set) || targetSet.size === 0) return null;
  if (!GameInfo?.Constructibles || !Districts || !Constructibles) return null;

  const resultByDisplayKey = Object.create(null);
  const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];

  for (const instanceId of improvements) {
    const instance = Constructibles.get(instanceId);
    if (!instance) continue;

    const location = instance.location;
    if (!location || location.x == null || location.y == null) continue;

    // Respect warehouse/“free constructible” logic
    const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
    const fcInfo = GameInfo.Constructibles.lookup(fcID);
    if (!fcInfo) continue;

    const logicalType = fcInfo.ConstructibleType;
    if (!targetSet.has(logicalType)) continue;

    // Use the *instance* constructible for display
    const info = GameInfo.Constructibles.lookup(instance.type);
    const ctype = info?.ConstructibleType || logicalType;
    const displayKey =
      ETFI_IMPROVEMENTS.displayNames[ctype] || info?.Name || ctype;

    if (!resultByDisplayKey[displayKey]) {
      resultByDisplayKey[displayKey] = {
        key: displayKey,
        ctype,
        iconId: ctype,
        displayName: Locale.compose(displayKey),
        count: 0,
      };
    }
    resultByDisplayKey[displayKey].count += 1;
  }

  const items = Object.values(resultByDisplayKey);
  if (!items.length) return null;

  const baseTotal = items.reduce((sum, item) => sum + item.count, 0);
  const multiplier = getEraMultiplier(baseMultiplier);
  const total = baseTotal * multiplier;

  return { items, total, multiplier, baseCount: baseTotal };
}

function renderImprovementDetailsHTML(summary, yieldIconId) {
  if (!summary) return null;

  const { items, total, multiplier, baseCount } = summary;
  const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");

  let html = `
    <div class="flex flex-col w-full">
      ${renderHeaderBadge(yieldIconId, total)}
  `;

  // Main breakdown
  html += `
    <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
      <div class="flex justify-between mb-1">
        <span>${labelTotalImprovements}</span>
        <span>${
          typeof baseCount === "number"
            ? baseCount
            : Math.round(total / (multiplier || 1))
        }</span>
      </div>
      <div class="mt-1 border-t border-white/10"></div>
  `;

  for (const item of items) {
    const perImprovementYield = item.count * multiplier;
    html += `
      <div class="flex justify-between items-center mt-1">
        <div class="flex items-center gap-2">
          <fxs-icon data-icon-id="${item.iconId}" class="size-5"></fxs-icon>
          <span class="opacity-60">| </span>
          <span>${item.displayName}</span>
          <span class="opacity-70 ml-1">x${item.count}</span>
        </div>
        <div class="flex items-center gap-1">
          <fxs-icon data-icon-id="${yieldIconId}" class="size-4"></fxs-icon>
          <span class="font-semibold">+${perImprovementYield}</span>
        </div>
      </div>
    `;
  }

  // Close main breakdown
  html += `</div>`;

  // Bonus Yields: shared helper
  //html += renderEtfiPolicyBonusYieldsHTML(yieldIconId);

  // Close wrapper
  html += `</div>`;
  return html;
}

export default class FoodFocusDetails {
  /**
   * Returns HTML for Farming/Fishing focus, or null if no qualifying improvements.
   */
  render(city) {
    const summary = getImprovementSummaryForSet(
      city,
      ETFI_IMPROVEMENTS.sets.food
    );
    if (!summary) return null;
    return renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
  }
}
