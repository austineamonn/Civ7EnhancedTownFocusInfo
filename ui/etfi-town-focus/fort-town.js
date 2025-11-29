// ui/production-chooser/details/fort-town.js
//
// Fort Town: shows a Fortify header and wall breakdown.
// Header value: +25 per "age-qualified" wall.
// Details: all walls listed with xcount, but only age-qualified walls add Fortify value.

import { ETFI_YIELDS, renderHeader, renderDetailsRow } from "../../etfi-utilities.js";

export default class FortTownDetails {
  render(city) { // `city` is unused, but kept for API consistency
    if (!city || !Cities || !city.Constructibles || !GameInfo?.Constructibles) return null;

    const currentAge = GameInfo?.Ages?.lookup?.(Game.age);
    const ageType = (currentAge?.AgeType || "").trim();
    const VALUE = 25;
    const labelTotalWalls = Locale.compose("LOC_MOD_ETFI_TOTAL_WALLS");

    const buildingIds = city.Constructibles.getIdsOfClass("BUILDING") || [];
    const totalWalls = [];   // all walls, with per-wall "qualifies" flag
    let totalQualifiedCount = 0; // walls that actually produce +25 in this Age

    for (const index of buildingIds) {
      const instance = Constructibles?.get(index);
      if (!instance) continue;

      const info = GameInfo.Constructibles?.lookup(instance.type);
      if (!info) continue;

      //const displayName = Locale.compose(info.Name) || "";
      const typeName = info.ConstructibleType || "";
      const isWall = typeName.includes("WALLS") || typeName.includes("FORTIFICATION");
      //const isWall = displayName.includes("Wall") || displayName.includes("Fortification"); // or extend with Fortification, etc.
      if (!isWall) continue;

      // --- Age gating logic ---
      // Ancient Walls only count in Antiquity
      // Medieval Walls only count in Exploration
      // Defensive Walls only count in Modern
      const isAntiquityWall   = typeName.includes("ANCIENT");
      const isExplorationWall = typeName.includes("MEDIEVAL");
      const isModernWall = typeName.includes("DEFENSIVE");

      let qualifiesForAge = false;
      if (ageType === "AGE_ANTIQUITY"   && isAntiquityWall)   qualifiesForAge = true;
      if (ageType === "AGE_EXPLORATION" && isExplorationWall) qualifiesForAge = true;
      if (ageType === "AGE_MODERN"      && isModernWall)      qualifiesForAge = true;
      // --- end Age gating ---

      totalWalls.push({
        iconId: info.ConstructibleType,
        nameKey: info.Name,
        qualifiesForAge,
      });

      if (qualifiesForAge) {
        totalQualifiedCount += 1;
      }
    }

    // If there are no walls at all, just show +0 Fortify in the header.
    if (!totalWalls.length) {
      const headerHtml = renderHeader([ETFI_YIELDS.FORTIFY], 0);
      return `
        <div class="flex flex-col w-full">
          ${headerHtml}
        </div>
      `;
    }

    // Group walls by name so duplicates are shown as "xN".
    // Each bucket tracks:
    //   - totalCount: number of that wall type
    //   - qualifyingCount: how many of that type actually give +25 in this Age
    const wallBuckets = Object.create(null);
    for (const w of totalWalls) {
      const key = w.nameKey || "LOC_UNKNOWN";
      if (!wallBuckets[key]) {
        wallBuckets[key] = {
          iconId: w.iconId,
          nameKey: w.nameKey,
          totalCount: 0,
          qualifyingCount: 0,
        };
      }
      wallBuckets[key].totalCount += 1;
      if (w.qualifiesForAge) {
        wallBuckets[key].qualifyingCount += 1;
      }
    }

    const wallItems = Object.values(wallBuckets);

    // Header: Fortify icon with total fortify value
    const totalFortify = totalQualifiedCount * VALUE;
    const headerHtml = renderHeader([ETFI_YIELDS.FORTIFY], totalFortify);

    let html = `
      <div class="flex flex-col w-full">
        ${headerHtml}
    `;

    // Details only if we have at least one wall (we do, because of the early check)
    html += `
      <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
        <div class="flex justify-between mb-1">
          <span>${labelTotalWalls}</span>
          <span>${totalWalls.length}</span>
        </div>
        <div class="mt-1 border-t border-white/10"></div>
    `;

    // One detail row per wall type:
    //   [icon] | Name xTotalCount       [Fortify icon] + (qualifyingCount * VALUE)
    // For non-qualifying walls in this Age, this will show +0.
    for (const wall of wallItems) {
      const displayName = Locale.compose(wall.nameKey);
      const yieldValue = wall.qualifyingCount * VALUE;

      const leftHtml = `
        <span class="inline-flex items-center gap-2 whitespace-nowrap">
          <fxs-icon data-icon-id="${wall.iconId}" class="size-5"></fxs-icon>
          <span class="opacity-60">| </span>
          <span>${displayName}</span>
          <span class="opacity-70 ml-1">x${wall.totalCount}</span>
        </span>
      `;

      html += renderDetailsRow({
        leftHtml,
        yieldIconId: ETFI_YIELDS.FORTIFY,
        yieldValue,
      });
    }

    html += `
      </div> <!-- end details -->
    </div>   <!-- end outer -->
    `;

    return html;
  }
}
