// ui/production-chooser/details/resort-details.js

// Self-contained Resort details renderer.
// Per-age H & G on tiles with ≥1 base Happiness; +50% on Natural Wonders.
// Header shows summed deltas; body lists improvement buckets and wonder buckets.
// Returns null if there are no applicable deltas (caller can render +0 fallback).

const ETFI_YIELDS = {
  HAPPINESS: "YIELD_HAPPINESS",
  GOLD: "YIELD_GOLD",
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE",
};

function getEraMultiplier(base = 1) {
  let m = base;
  const ageData = GameInfo.Ages.lookup(Game.age);
  if (!ageData) return m;
  const t = (ageData.AgeType || "").trim();
  if (t === "AGE_EXPLORATION") m += 1;
  else if (t === "AGE_MODERN") m += 2;
  return m;
}

function fmt1(x) {
  const v = Math.round(x * 10) / 10;
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
}

function renderHeaderChipsFromMap(yieldMap, order) {
  let html = "";
  for (const yType of order) {
    const val = yieldMap[yType];
    if (!val) continue;
    html += `
      <div class="flex items-center gap-2 mr-2">
        <fxs-icon data-icon-id="${yType}" class="size-5"></fxs-icon>
        <span class="font-semibold">+${fmt1(val)}</span>
      </div>
    `;
  }
  return html;
}

export default class ResortDetails {
  render(city) {
    if (!city || !city.Constructibles || !GameplayMap || !GameInfo?.Constructibles || !GameInfo?.Features || !GameInfo?.Yields) {
      return null;
    }

    const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];
    if (!improvements.length) return null;

    const multiplier = getEraMultiplier(); // per-age H & G for happy tiles

    const improvementBuckets = Object.create(null); // non-wonder tiles (≥1 base H)
    const wonderBuckets = Object.create(null);      // natural wonder tiles grouped by wonder name
    const globalDeltas = Object.create(null);       // summed deltas for header chips

    const addToGlobal = (yType, amount) => {
      if (!amount) return;
      globalDeltas[yType] = (globalDeltas[yType] || 0) + amount;
    };

    for (const instanceId of improvements) {
      const instance = Constructibles.get(instanceId);
      if (!instance) continue;

      const loc = instance.location;
      if (!loc || loc.x == null || loc.y == null) continue;
      const { x, y } = loc;

      const isNW = GameplayMap.isNaturalWonder(x, y);

      // 1) Base yields on this tile
      const baseYields = Object.create(null);
      for (const yInfo of GameInfo.Yields) {
        const amt = GameplayMap.getYield(x, y, yInfo.YieldType, GameContext.localPlayerID);
        if (amt !== 0) baseYields[yInfo.YieldType] = amt;
      }

      const happyBase = baseYields[ETFI_YIELDS.HAPPINESS] || 0;

      // If not a Natural Wonder and tile has no base Happiness, Resort adds nothing
      if (!isNW && happyBase <= 0) continue;

      // Start from base and apply Resort effects
      const tileYields = Object.create(null);
      for (const yType in baseYields) tileYields[yType] = baseYields[yType];

      // 2) Per-age H & G on tiles with ≥1 base Happiness
      if (happyBase > 0) {
        tileYields[ETFI_YIELDS.HAPPINESS] = (tileYields[ETFI_YIELDS.HAPPINESS] || 0) + multiplier;
        tileYields[ETFI_YIELDS.GOLD]      = (tileYields[ETFI_YIELDS.GOLD] || 0) + multiplier;
      }

      // 3) +50% yields on Natural Wonders (after per-age bonuses)
      if (isNW) {
        for (const yType in tileYields) tileYields[yType] *= 1.5;
      }

      // 4) Delta = final - base (Resort contribution)
      const deltaYields = Object.create(null);
      let hasDelta = false;
      for (const yInfo of GameInfo.Yields) {
        const yType = yInfo.YieldType;
        const base = baseYields[yType] || 0;
        const fin  = tileYields[yType] || 0;
        const d = fin - base;
        if (Math.abs(d) > 1e-6) {
          deltaYields[yType] = d;
          hasDelta = true;
          addToGlobal(yType, d);
        }
      }
      if (!hasDelta) continue;

      const cinfo = GameInfo.Constructibles.lookup(instance.type);
      const ctype = cinfo?.ConstructibleType;

      if (isNW) {
        // Group by wonder name; show all resulting yields
        const fType = GameplayMap.getFeatureType(x, y);
        const fInfo = GameInfo.Features.lookup(fType);
        const wonderName = Locale.compose(fInfo?.Name) || "Natural Wonder";
        const iconId = ctype || fInfo?.FeatureType;

        let wb = wonderBuckets[wonderName];
        if (!wb) {
          wb = { key: wonderName, iconId, count: 0, yields: Object.create(null) };
          wonderBuckets[wonderName] = wb;
        }
        wb.count += 1;
        for (const yType in deltaYields) {
          wb.yields[yType] = (wb.yields[yType] || 0) + deltaYields[yType];
        }
      } else {
        // Non-wonder, happy tiles: bucket by improvement; show extra H & G
        const displayName = Locale.compose(cinfo?.Name) || ctype || "LOC_UNKNOWN";
        let ib = improvementBuckets[displayName];
        if (!ib) {
          ib = { key: displayName, iconId: ctype, displayName, count: 0, deltaH: 0, deltaG: 0 };
          improvementBuckets[displayName] = ib;
        }
        ib.count += 1;
        ib.deltaH += deltaYields[ETFI_YIELDS.HAPPINESS] || 0;
        ib.deltaG += deltaYields[ETFI_YIELDS.GOLD] || 0;
      }
    }

    if (!Object.keys(globalDeltas).length) return null;

    const improvementItems = Object.values(improvementBuckets);
    const wonderItems = Object.values(wonderBuckets);

    // Header chips order
    const headerOrder = [
      ETFI_YIELDS.HAPPINESS,
      ETFI_YIELDS.GOLD,
      ETFI_YIELDS.FOOD,
      ETFI_YIELDS.PRODUCTION,
      ETFI_YIELDS.SCIENCE,
      ETFI_YIELDS.CULTURE,
    ];

    const headerYieldsHtml = renderHeaderChipsFromMap(globalDeltas, headerOrder);

    // Label + base counts
    const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");
    const baseTotalImprovements = improvementItems.reduce((s, it) => s + (it.count || 0), 0);
    const totalWonderTiles = wonderItems.reduce((s, w) => s + (w.count || 0), 0);
    const baseTotalAllTiles = baseTotalImprovements + totalWonderTiles;

    let html = `
      <div class="flex flex-col w-full">
        <div
          class="flex items-center justify-center gap-4 mb-2 rounded-md px-3 py-2 flex-wrap"
          style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
        >
          ${headerYieldsHtml}
        </div>

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalImprovements}</span>
            <span>${baseTotalAllTiles}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    // Improvements (non-wonder, happy tiles)
    for (const item of improvementItems) {
      const hVal = fmt1(item.deltaH);
      const gVal = fmt1(item.deltaG);
      html += `
        <div class="flex justify-between items-center mt-1">
          <div class="flex items-center gap-2">
            <fxs-icon data-icon-id="${item.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${item.displayName}</span>
            <span class="opacity-70 ml-1">x${item.count}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="flex items-center gap-2">
              <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${hVal}</span>
            </span>
            <span class="flex items-center gap-2">
              <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${gVal}</span>
            </span>
          </div>
        </div>
      `;
    }

    html += `</div>`; // close improvements section

    // Natural Wonders breakdown
    if (wonderItems.length) {
      const labelNaturalWonder = Locale.compose("LOC_MOD_ETFI_NATURAL_WONDER") || "Natural Wonder";
      const showWonderLabel = improvementItems.length > 0;

      html += `<div class="mt-2" style="font-size: 0.8em; line-height: 1.4;">`;

      for (const w of wonderItems) {
        // Primary H/G, then all others
        const primaryOrder = [ETFI_YIELDS.HAPPINESS, ETFI_YIELDS.GOLD];
        const secondaryOrder = [];
        for (const yInfo of GameInfo.Yields) {
          const yType = yInfo.YieldType;
          if (primaryOrder.indexOf(yType) !== -1) continue;
          secondaryOrder.push(yType);
        }
        const orderedYields = primaryOrder.concat(secondaryOrder);

        let yieldsHtml = "";
        for (const yType of orderedYields) {
          const val = w.yields?.[yType];
          if (!val) continue;
          yieldsHtml += `
            <span class="inline-flex items-center gap-2 mr-1">
              <fxs-icon data-icon-id="${yType}" class="size-4"></fxs-icon>
              <span>+${fmt1(val)}</span>
            </span>
          `;
        }

        html += `<div class="mt-2">`;

        if (showWonderLabel) {
          html += `
            <div class="text-white/90" style="font-size: 0.75em;">
              ${labelNaturalWonder}
            </div>
            <div class="mt-1 mb-1 border-t border-white/10"></div>
          `;
        }

        html += `
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <fxs-icon data-icon-id="${w.iconId}" class="size-5"></fxs-icon>
                <span class="opacity-60">| </span>
                <span>${w.key}</span>
                <span class="opacity-70 ml-1">x${w.count}</span>
              </div>
              <div class="flex flex-wrap justify-end">
                ${yieldsHtml}
              </div>
            </div>
          </div>
        `;
      }

      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }
}
