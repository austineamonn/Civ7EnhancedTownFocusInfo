// ui/production-chooser/details/fort-town.js
//
// Fort Town: purely cosmetic focus.
// It just shows a header pill with the Fortify icon and "+0" to match
// the look of other town headers, but doesn't list any detail rows.

import { ETFI_YIELDS, renderHeader, renderDetailsRow } from "../../etfi-utilities.js";

export default class FortTownDetails {
  /**
   * For Fort Town we don't actually compute anything from the city.
   * We just render a single pill with the Fortify icon.
   *
   * `renderHeader` is called with only the icon ID:
   *   - yieldOrder = [ "ACTION_FORTIFY" ]
   *   - totals is omitted/undefined
   *
   * In that case, renderHeader's fallback kicks in and renders:
   *   +25 [Fortify icon]
   * inside a colored pill.
   */
  render(city) { // `city` is unused, but kept for API consistency
    if (!city || !Cities || !city.Constructibles ||  !GameInfo?.Constructibles) return null;
    const VALUE = 25;
    const labelTotalWalls = Locale.compose("LOC_MOD_ETFI_TOTAL_WALLS");

    const buildingIds = city.Constructibles.getIdsOfClass("BUILDING") || [];
    //const byTile = Object.create(null);
    const totalWalls = []; 
    let totalCount = 0;

    for (const index of buildingIds) {
      const instance = Constructibles?.get(index);
      const info = GameInfo.Constructibles?.lookup(instance.type);
      const isWall = Locale.compose(info.Name).includes("Wall");

      if(!instance || !isWall)  continue;
      
      totalWalls.push({
        iconId: info.ConstructibleType,
        nameKey: info.Name,
      });

      totalCount += 1;
    }

    // Group walls by name so duplicates are shown as "xN"
    const wallBuckets = Object.create(null);
    for (const w of totalWalls) {
      const key = w.nameKey || "LOC_UNKNOWN";
      if (!wallBuckets[key]) {
        wallBuckets[key] = {
          iconId: w.iconId,
          nameKey: w.nameKey,
          count: 0,
        };
      }
      wallBuckets[key].count += 1;
    }

    const wallItems = Object.values(wallBuckets);

    // Header: Fortify icon with total fortify value
    const totalFortify = totalCount* VALUE;
    const headerHtml = renderHeader([ETFI_YIELDS.FORTIFY], totalFortify);

    let html = `
      <div class="flex flex-col w-full">
        ${headerHtml}
    `;

    if (totalWalls.length) {
      html += `
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalWalls}</span>
            <span>${totalCount}</span>
          </div>
        <div class="mt-1 border-t border-white/10"></div>
      `;
    
      // One detail row per wall type:
      //   [icon] | Name xCount      [Fortify icon] + (Count * VALUE)
      for (const wall of wallItems) {
        const displayName = Locale.compose(wall.nameKey);
        const yieldValue = wall.count * VALUE;

        const leftHtml = `
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <fxs-icon data-icon-id="${wall.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${displayName}</span>
            <span class="opacity-70 ml-1">x${wall.count}</span>
          </span>
        `;

        html += renderDetailsRow({
          leftHtml,
          yieldIconId: ETFI_YIELDS.FORTIFY,
          yieldValue,
        });
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
      </div> <!-- end outer -->
    `;
    
    return html;
  }
}