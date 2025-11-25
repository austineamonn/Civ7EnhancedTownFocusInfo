// #region Constants
export const ETFI_YIELDS = Object.freeze({
    FOOD: "YIELD_FOOD",
    PRODUCTION: "YIELD_PRODUCTION",
    GOLD: "YIELD_GOLD",
    HAPPINESS: "YIELD_HAPPINESS",
    SCIENCE: "YIELD_SCIENCE",
    CULTURE: "YIELD_CULTURE",
    INFLUENCE: "YIELD_DIPLOMACY",
});

// #region Logic Helpers
export function fmt1(x) {
    const v = Math.round(x * 10) / 10;
    return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
}

export function getEraMultiplier(base = 1) {
    let multiplier = base;
    const ageData = GameInfo.Ages.lookup(Game.age);
    if (!ageData) return multiplier;
    const ageType = (ageData.AgeType || "").trim();
    if (ageType === "AGE_EXPLORATION") multiplier += 1;
    else if (ageType === "AGE_MODERN") multiplier += 2;
    return multiplier;
}

export function getImprovementSummaryForSet({ city, targetSet, displayNameMap, baseMultiplier = 1 }) {
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
  
      // Respect warehouse / free constructible logic
      const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
      const fcInfo = GameInfo.Constructibles.lookup(fcID);
      if (!fcInfo) continue;
  
      const logicalType = fcInfo.ConstructibleType;
      if (!targetSet.has(logicalType)) continue;
  
      const info = GameInfo.Constructibles.lookup(instance.type);
      const ctype = info?.ConstructibleType || logicalType;
      const displayKey = (displayNameMap && displayNameMap[ctype]) || info?.Name || ctype;
  
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


// #region Render Helpers
export function renderHeaderBadge(iconId, value) {
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

export function renderHeaderChips(yieldOrder, totals) {
    let html = "";
    if (!yieldOrder || !totals) return html;

    // First check if any yield is actually > 0
    const hasPositive = yieldOrder.some((yType) => {
        const v = totals[yType];
        return typeof v === "number" && v > 0;
    });

    for (const yType of yieldOrder) {
        const val = totals[yType];

        // If we have at least one positive value, only show positives
        if (hasPositive) {
            if (typeof val !== "number" || val <= 0) continue;
        } else {
            // No positive values: if it's not a number at all, skip it
            if (typeof val !== "number") continue;
            // but DO show 0 so the header isn't empty
        }

        html += `
        <div class="flex items-center gap-2 mr-2">
          <fxs-icon data-icon-id="${yType}" class="size-5"></fxs-icon>
          <span class="font-semibold">+${fmt1(val)}</span>
        </div>
      `;
    }

    return html;
}

export function renderImprovementDetailsHTML(summary, yieldIconId) {
    if (!summary) return null;
  
    const { items, total, multiplier, baseCount } = summary;
    const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");
  
    let html = `
      <div class="flex flex-col w-full">
        <div 
          class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2"
          style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
        >
          <fxs-icon data-icon-id="${yieldIconId}" class="size-5"></fxs-icon>
          <span class="font-semibold">+${total}</span>
        </div>
    `;
  
    html += `
      <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4%;">
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