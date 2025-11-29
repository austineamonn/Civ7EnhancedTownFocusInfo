// ui/production-chooser/details/temple-town.js

// Temple Town: +1 Happiness per completed BUILDING in this town.
// Groups buildings by tile; stacks (2+ on a tile) are listed first.
// Walls are counted separately and shown in their own section,
// grouped by wall name with x<count> and +<count> Happiness.
//
// Returns null if the city has no completed *non-wall* buildings.

import { ETFI_YIELDS, renderHeader } from "../../etfi-utilities.js";

export default class TempleDetails {
  render(city) {
    if (
      !city ||
      !city.Constructibles ||
      !Constructibles ||
      !GameInfo?.Constructibles
    ) {
      return null;
    }

    const constructibles = city.Constructibles;
    const buildingIds = constructibles.getIdsOfClass("BUILDING") || [];
    if (!buildingIds.length) return null;

    // Per-tile buckets:
    //   byTile[tileKey] = { buildings: [...], walls: [...] }
    const byTile = Object.create(null);

    let totalBuildings = 0;   // non-wall buildings
    let totalWalls = 0;       // total walls (all tiles)
    const allWalls = [];      // flat list of all walls for global grouping

    for (const instanceId of buildingIds) {
      const inst = Constructibles.get(instanceId);
      if (!inst || !inst.complete) continue;

      const loc = inst.location;
      if (!loc || loc.x == null || loc.y == null) continue;

      const info = GameInfo.Constructibles.lookup(inst.type);
      if (!info) continue;

      const key = `${loc.x},${loc.y}`;
      if (!byTile[key]) {
        byTile[key] = {
          buildings: [],
          walls: [],
        };
      }
      
      const typeName = info.ConstructibleType || "";
      const isWall = typeName.includes("WALLS") || typeName.includes("FORTIFICATIONS");

      if (isWall) {
        // Track walls on this tile
        byTile[key].walls.push({
          iconId: info.ConstructibleType,
          nameKey: info.Name,
        });

        // Track walls globally for later grouping
        allWalls.push({
          iconId: info.ConstructibleType,
          nameKey: info.Name,
        });

        totalWalls += 1;
      } else {
        // Normal building
        byTile[key].buildings.push({
          iconId: info.ConstructibleType,
          nameKey: info.Name,
        });

        totalBuildings += 1;
      }
    }

    // If there are no non-wall buildings, the Temple focus is irrelevant.
    if (!totalBuildings) return null;

    // Sort per-tile stacks by descending number of buildings;
    // tiles with more buildings appear first.
    const stacks = Object.values(byTile).sort(
      (a, b) => b.buildings.length - a.buildings.length
    );
    if (!stacks.length) return null;

    const bullet = "•";
    const labelTotalBuildings = Locale.compose("LOC_MOD_ETFI_TOTAL_BUILDINGS");
    const labelTotalWalls = Locale.compose("LOC_MOD_ETFI_TOTAL_WALLS");
    const totalHappiness = totalBuildings + totalWalls;

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(ETFI_YIELDS.HAPPINESS, totalHappiness)}

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <!-- Buildings summary -->
          <div class="flex justify-between mb-1">
            <span>${labelTotalBuildings}</span>
            <span>${totalBuildings}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    // ==== BUILDING ROWS (grouped by tile) ====
    for (const stack of stacks) {
      const arr = stack.buildings || [];
      if (!arr.length) continue; // skip tiles that only had walls

      const bonus = arr.length; // +1 Happiness per building on this tile

      // First pass: localize building names
      const localized = arr.map((b) => {
        const name = Locale.compose(b.nameKey);
        return {
          iconId: b.iconId,
          nameKey: b.nameKey,
          name,
        };
      });

      const totalNameLength = localized.reduce(
        (sum, b) => sum + (b.name ? b.name.length : 0),
        0
      );

      // Heuristic: if we have many buildings or very long names,
      // shrink the font a bit to reduce overflow.
      const needsSmallerText =
        localized.length >= 3 || totalNameLength > 40;
      const rowTextStyle = needsSmallerText ? ' style="font-size: 0.8em;"' : "";

      // Build "icon | name • icon | name ..." segment
      let buildingsHtml = "";
      for (let i = 0; i < localized.length; i++) {
        const b = localized[i];
        if (i > 0) {
          buildingsHtml += `<span class="mx-1">${bullet}</span>`;
        }
        buildingsHtml += `
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <fxs-icon data-icon-id="${b.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${b.name}</span>
          </span>
        `;
      }

      html += `
        <div class="flex items-center mt-1">
          <div class="flex items-center gap-2 min-w-0 flex-1"${rowTextStyle}>
            ${buildingsHtml}
          </div>
          <div class="flex items-center gap-1 ml-3 shrink-0 justify-end text-right">
            <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${bonus}</span>
          </div>
        </div>
      `;
    }

    // ==== WALL SECTION (global by wall type) ====
    if (totalWalls > 0 && allWalls.length) {
      // Small vertical gap between buildings section and walls section
      html += `
          <div style="height: 0.7rem;"></div>

          <!-- Walls summary -->
          <div class="flex justify-between mb-1">
            <span>${labelTotalWalls}</span>
            <span>${totalWalls}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
      `;

      // Group all walls by nameKey so we can show "xN" for duplicates
      const groupedWalls = Object.create(null);
      for (const w of allWalls) {
        const key = w.nameKey;
        if (!groupedWalls[key]) {
          groupedWalls[key] = {
            iconId: w.iconId,
            nameKey: w.nameKey,
            count: 0,
          };
        }
        groupedWalls[key].count += 1;
      }

      const groupedList = Object.values(groupedWalls);

      // Optional heuristic for shrinking font for very long wall lists.
      const totalWallNameLength = groupedList.reduce((sum, w) => {
        const name = Locale.compose(w.nameKey);
        return sum + (name ? name.length : 0);
      }, 0);
      const wallsNeedSmallerText =
        groupedList.length >= 3 || totalWallNameLength > 40;
      const wallsRowTextStyle = wallsNeedSmallerText
        ? ' style="font-size: 0.8em;"'
        : "";

      for (const gw of groupedList) {
        const name = Locale.compose(gw.nameKey) || gw.nameKey;
        const count = gw.count;
        const bonus = count; // +1 Happiness per wall

        const leftHtml = `
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <fxs-icon data-icon-id="${gw.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${name}</span>
            <span class="opacity-70 ml-1">x${count}</span>
          </span>
        `;

        html += `
          <div class="flex items-center mt-1">
            <div class="flex items-center gap-2 min-w-0 flex-1"${wallsRowTextStyle}>
              ${leftHtml}
            </div>
            <div class="flex items-center gap-1 ml-3 shrink-0 justify-end text-right">
              <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${bonus}</span>
            </div>
          </div>
        `;
      }
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }
}
