//Author: Zatygold
//etfi-utilities.js

// #region Constants

// Canonical yield IDs for this mod.
// These match the game's internal YieldType strings and are used everywhere
// in the town focus UI and logic. The object is frozen so nothing can modify
// it at runtime by mistake.
export const ETFI_YIELDS = Object.freeze({
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  GOLD: "YIELD_GOLD",
  HAPPINESS: "YIELD_HAPPINESS",
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE",
  INFLUENCE: "YIELD_DIPLOMACY",
  TRADE: "YIELD_TRADES",
  FORTIFY: "ACTION_FORTIFY"
});

// Base background colors for the "pill" elements in the header.
// Each key is a YieldType string from ETFI_YIELDS. The RGBA values are
// derived from the base hex colors with baked-in transparency (alpha = 0.35)
// so the pill still looks tinted but not too harsh on the dark header bar.
const HEADER_YIELD_COLORS = Object.freeze({
  [ETFI_YIELDS.FOOD]:       "rgba(128, 179,  77, 0.35)", // #80b34d
  [ETFI_YIELDS.PRODUCTION]: "rgba(163,  61,  41, 0.35)", // #a33d29
  [ETFI_YIELDS.GOLD]:       "rgba(246, 206,  85, 0.35)", // #f6ce55
  [ETFI_YIELDS.SCIENCE]:    "rgba(108, 166, 224, 0.35)", // #6ca6e0
  [ETFI_YIELDS.CULTURE]:    "rgba( 92,  92, 214, 0.35)", // #5c5cd6
  [ETFI_YIELDS.HAPPINESS]:  "rgba(245, 153,  61, 0.35)", // #f5993d
  [ETFI_YIELDS.INFLUENCE]:  "rgba(175, 183, 207, 0.35)", // #afb7cf
});

// Fallback pill background color if we don't recognize the yield type.
// Slightly translucent white to keep the UI readable but neutral.
const DEFAULT_HEADER_BG = "rgba(255, 255, 255, 0.25)";

// Shared inline style string for the entire header bar container.
// This controls the dark glassy background and foreground text color.
const HEADER_BAR_STYLE = "background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;";

// #endregion

// #region Logic Helpers

/**
 * Format a number with at most 1 decimal place.
 *
 * Rules:
 * - 0 stays "0"
 * - Integers render without a decimal: 1 → "1"
 * - Non-integers render with one decimal: 1.34 → "1.3", 1.36 → "1.4"
 *
 * This avoids ugly floating-point artifacts (like 1.999999) and keeps
 * the pill text compact for small header elements.
 *
 * @param {number} x - numeric value to format
 * @returns {string} formatted number string
 */
export function fmt1(x) {
  // Fast path for 0 so we don't risk "-0" or "0.0"
  if (x === 0) return "0";

  // Round to one decimal place.
  // Example: 1.34 → 13.4 → 13 → 1.3
  const v = Math.round(x * 10) / 10;

  // If the rounded value is effectively an integer, drop the .0
  // and show it as "2" instead of "2.0".
  return Math.abs(v - Math.round(v)) < 1e-9
    ? String(Math.round(v))
    : v.toFixed(1);
}

/**
 * Compute the yield multiplier based on the current game Age.
 *
 * - Starts from a base multiplier (usually 1 or 2, provided by the town rule).
 * - If the player is in the Exploration Age, add +1.
 * - If the player is in the Modern Age, add +2.
 * - Otherwise, leave the base multiplier unchanged.
 *
 * This centralizes the "per-age" scaling so each town script doesn't need to
 * duplicate the Age logic.
 *
 * @param {number} [base=1] - base multiplier before age bonuses
 * @returns {number} effective multiplier after age adjustments
 */
export function getEraMultiplier(base = 1) {
  let multiplier = base;

  // Guarded lookup so we don't crash if some part of GameInfo is missing.
  const ageData = GameInfo?.Ages?.lookup?.(Game.age);
  if (!ageData) return multiplier;

  const ageType = (ageData.AgeType || "").trim();

  // Exploration Age: +1 to multiplier
  if (ageType === "AGE_EXPLORATION") multiplier += 1;
  // Modern Age: +2 to multiplier
  else if (ageType === "AGE_MODERN") multiplier += 2;

  return multiplier;
}

/**
 * Scan the city's improvements and build a summary object for a given "logical set"
 * of improvement types (e.g., farms + pastures + plantations for Food Town).
 *
 * This function:
 * - Filters improvement instances to those whose logical free-constructible type
 *   is in `targetSet`.
 * - Groups them by a display key (with optional overrides from `displayNameMap`).
 * - Counts how many of each display key exists.
 * - Applies an era multiplier to compute the total yield effect.
 *
 * Return structure:
 * {
 *   items: [
 *     {
 *       key,        // display key used for grouping
 *       ctype,      // ConstructibleType used as icon ID
 *       iconId,     // same as ctype; used by <fxs-icon>
 *       displayName,// localized display string
 *       count       // number of instances for this group
 *     },
 *     ...
 *   ],
 *   total,         // baseTotal * eraMultiplier
 *   multiplier,    // era multiplier actually used
 *   baseCount      // total number of qualifying improvements
 * }
 *
 * @param {Object} options
 * @param {Object} options.city - city object containing Constructibles
 * @param {Set<string>} options.targetSet - logical improvement types we care about
 * @param {Object} [options.displayNameMap] - optional mapping ConstructibleType -> LOC key override
 * @param {number} [options.baseMultiplier=1] - per-improvement yield before era scaling
 * @returns {Object|null} summary object or null if nothing matched
 */
export function getImprovementSummaryForSet({
  city,
  targetSet,
  displayNameMap,
  baseMultiplier = 1,
} = {}) {
  // Basic sanity checks: city and its constructibles must exist.
  if (!city || !city.Constructibles) return null;
  // targetSet must be a non-empty Set of logical types.
  if (!(targetSet instanceof Set) || targetSet.size === 0) return null;
  // Ensure we have the global systems we rely on.
  if (!GameInfo?.Constructibles || !Districts || !Constructibles) return null;

  // Map from displayKey -> { key, ctype, iconId, displayName, count }
  const resultByDisplayKey = Object.create(null);

  // Get all improvement instances in this city.
  const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];

  for (const instanceId of improvements) {
    const instance = Constructibles.get(instanceId);
    if (!instance) continue;

    const location = instance.location;
    if (!location || location.x == null || location.y == null) continue;

    // Use the "free constructible" to determine the logical improvement type at this tile.
    // This respects warehouses or other mechanics that alter the tile's effective improvement.
    const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
    const fcInfo = GameInfo.Constructibles.lookup(fcID);
    if (!fcInfo) continue;

    const logicalType = fcInfo.ConstructibleType;
    // Skip anything that isn't in the target set for this Town (e.g., non-food improvements).
    if (!targetSet.has(logicalType)) continue;

    // Use the actual instance's ConstructibleType and name for display and icon.
    const info = GameInfo.Constructibles.lookup(instance.type);
    const ctype = info?.ConstructibleType || logicalType;

    // Optionally override the display key from displayNameMap; otherwise use the LOC name or type.
    const displayKey =
      (displayNameMap && displayNameMap[ctype]) || info?.Name || ctype;

    // Ensure we have a bucket for this display key.
    if (!resultByDisplayKey[displayKey]) {
      resultByDisplayKey[displayKey] = {
        key: displayKey,
        ctype,
        iconId: ctype,                 // Icon ID used directly by <fxs-icon>
        displayName: Locale.compose(displayKey), // Localized display name
        count: 0,
      };
    }

    // Increment the count for this display group.
    resultByDisplayKey[displayKey].count += 1;
  }

  const items = Object.values(resultByDisplayKey);
  if (!items.length) return null;

  // Total number of qualifying improvements before era scaling.
  const baseTotal = items.reduce((sum, it) => sum + it.count, 0);

  // Compute the era multiplier once and apply it to the base total.
  const multiplier = getEraMultiplier(baseMultiplier);
  const total = baseTotal * multiplier;

  return { items, total, multiplier, baseCount: baseTotal };
}

// #endregion Logic Helpers

// #region Header Rendering

/**
 * Unified header renderer for all town focus panels.
 *
 * It renders one or more "pill" elements inside a shared header bar, each pill
 * showing:
 *   +<value> [yield icon]
 *
 * Flexible usage:
 * - Single yield with a single number:
 *     renderHeader(ETFI_YIELDS.HAPPINESS, 3);
 *
 * - Single yield with a map:
 *     renderHeader([ETFI_YIELDS.HAPPINESS], { [ETFI_YIELDS.HAPPINESS]: 3 });
 *
 * - Multiple yields:
 *     renderHeader(
 *       [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS],
 *       { [ETFI_YIELDS.GOLD]: 2, [ETFI_YIELDS.HAPPINESS]: 1 }
 *     );
 *
 * @param {string|string[]} yieldOrder
 *   Either a single yield ID string or an array of yield IDs
 *   (e.g. [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS])
 *
 * @param {Object|number} totals
 *   Either:
 *   - A single number (applied to all yields in yieldOrder), or
 *   - An object map: { [yieldId]: numericValue }
 */
export function renderHeader(yieldOrder, totals) {
    // Normalize yieldOrder into an array of yield IDs the caller *explicitly* wants.
    const order = Array.isArray(yieldOrder) ? yieldOrder.filter(Boolean) : (yieldOrder ? [yieldOrder] : []); // remove falsy entries just in case
  
    // If the caller didn't specify any yields, just render the bare header bar
    // so the layout stays stable, but don't guess or add any pills.
    if (!order.length) {
      return `
        <div
          class="flex items-center justify-center mb-2 rounded-md px-3 py-2 flex-wrap"
          style="${HEADER_BAR_STYLE}"
        >
        </div>
      `;
    }
  
    // Normalize totals into a { [yieldId]: number } map.
    // Two supported call patterns:
    //   1) renderHeader([Y1, Y2], { [Y1]: 3, [Y2]: 1 })
    //   2) renderHeader([Y1, Y2], 0)          // apply same number to all yields in order
    let values;
    if (typeof totals === "number") {
      values = {};
      for (const y of order) {
        values[y] = totals;
      }
    } else if (totals && typeof totals === "object") {
      values = totals;
    } else {
      values = {};
    }
  
    let anyRendered = false;
    let headerItemsHtml = "";
  
    for (const yType of order) {
      const raw = values[yType];
  
      // Only skip if it's not a number at all.
      // 0, positive, and negative numbers are all valid and should show a pill.
      if (typeof raw !== "number") continue;
  
      anyRendered = true;
      const color = HEADER_YIELD_COLORS[yType] || DEFAULT_HEADER_BG;
  
      headerItemsHtml += `
        <div class="flex items-center mr-1">
          <div
            class="flex items-center justify-center gap-1"
            style="
              /* top | right | bottom | left */
              padding: 0.5px 4px 0.5px 8px;
              min-height: 0.5rem;
              border-radius: 9999px;
              background-color: ${color};
              border: 1px solid ${color};
              color: #f2f2f2;
              font-size: 0.9em;
            "
          >
            <span class="font-semibold">+${fmt1(raw)}</span>
            <fxs-icon data-icon-id="${yType}" class="size-7"></fxs-icon>
          </div>
        </div>
      `;
    }
  
    // // If the caller gave an order but none of the values were numeric,
    // // still render *one* pill (+0) for the first yield in the order so
    // // the header never looks completely empty.
    // if (!anyRendered) {
    //   const yType = order[0];
    //   const color = HEADER_YIELD_COLORS[yType] || DEFAULT_HEADER_BG;
  
    //   headerItemsHtml = `
    //     <div class="flex items-center mr-1">
    //       <div
    //         class="flex items-center justify-center gap-1"
    //         style="
    //           padding: 0.5px 4px 0.5px 8px;
    //           min-height: 0.5rem;
    //           border-radius: 9999px;
    //           background-color: ${color};
    //           border: 1px solid ${color};
    //           color: #f2f2f2;
    //           font-size: 0.9em;
    //         "
    //       >
    //         <span class="font-semibold">+0</span>
    //         <fxs-icon data-icon-id="${yType}" class="size-7"></fxs-icon>
    //       </div>
    //     </div>
    //   `;
    // }
  
    return `
      <div 
        class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2 flex-wrap"
        style="${HEADER_BAR_STYLE}"
      >
        ${headerItemsHtml}
      </div>
    `;
}

// #endregion Header Rendering

// #region Details Rendering

/**
 * Shared details renderer for the "improvement-based" Towns:
 * - Farming Town
 * - Fishing Town
 * - Mining Town
 *
 * Assumes `summary` came from `getImprovementSummaryForSet` and includes:
 *   - items: [{ iconId, displayName, count, ... }]
 *   - total: total yield from all improvements (after era multiplier)
 *   - multiplier: effective per-improvement multiplier after era scaling
 *   - baseCount: total number of qualifying improvements
 *
 * Output HTML structure:
 *   <div>
 *     [ header with yield pill ]
 *     [ "Total Improvements" row ]
 *     [ one row per improvement group: icon | name xN | +yield ]
 *   </div>
 *
 * @param {Object} summary - result of getImprovementSummaryForSet(...)
 * @param {string} yieldIconId - YieldType string used for the yield icon (e.g. ETFI_YIELDS.FOOD)
 * @returns {string|null} HTML snippet or null if summary is missing
 */
export function renderImprovementDetailsHTML(summary, yieldIconId) {
  if (!summary) return null;

  const { items, total, multiplier, baseCount } = summary;
  const labelTotalImprovements = Locale.compose(
    "LOC_MOD_ETFI_TOTAL_IMPROVEMENTS"
  );

  // Single-yield header: we pass a one-element array for the order
  // and a map with that yield's total value.
  const headerHtml = renderHeader([yieldIconId], { [yieldIconId]: total });

  let html = `
    <div class="flex flex-col w-full">
      ${headerHtml}
      <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
        <div class="flex justify-between mb-1">
          <span>${labelTotalImprovements}</span>
          <span>${
            typeof baseCount === "number"
              ? baseCount
              // Fallback: if baseCount wasn't provided, estimate it from total / multiplier.
              : Math.round(total / (multiplier || 1))
          }</span>
        </div>
        <div class="mt-1 border-t border-white/10"></div>
  `;

  // Render each improvement group:
  //   [icon] | [name] x<count>    [yield icon] +<count * multiplier>
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

// #endregion Details Rendering
