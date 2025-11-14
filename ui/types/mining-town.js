// ui/production-chooser/details/mining-details.js

// Self-contained Mining details renderer (kept local while we migrate).
const ETFI_YIELDS = {
  PRODUCTION: "YIELD_PRODUCTION",
};

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

    // Respect “free constructible” logic (warehouses, etc.)
    const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
    const fcInfo = GameInfo.Constructibles.lookup(fcID);
    if (!fcInfo) continue;

    const logicalType = fcInfo.ConstructibleType;
    if (!targetSet.has(logicalType)) continue;

    // Use the real instance for display/icon
    const info = GameInfo.Constructibles.lookup(instance.type);
    const ctype = info?.ConstructibleType || logicalType;
    const displayKey = ETFI_IMPROVEMENTS.displayNames[ctype] || info?.Name || ctype;

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

  const baseTotal = items.reduce((sum, it) => sum + it.count, 0);
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

  html += `
    <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
      <div class="flex justify-between mb-1">
        <span>${labelTotalImprovements}</span>
        <span>${typeof baseCount === "number" ? baseCount : Math.round(total / (multiplier || 1))}</span>
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

  html += `</div></div>`;
  return html;
}

export default class MiningDetails {
  /**
   * Returns HTML for Mining/Production focus, or null if no qualifying improvements.
   * Uses baseMultiplier=2 per existing logic.
   */
  render(city) {
    const summary = getImprovementSummaryForSet(
      city,
      ETFI_IMPROVEMENTS.sets.production,
      2 // base multiplier for Mining
    );
    if (!summary) return null;
    return renderImprovementDetailsHTML(summary, ETFI_YIELDS.PRODUCTION);
  }
}
