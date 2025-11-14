// ui/production-chooser/details/temple-details.js

// Temple Town: +1 Happiness per completed BUILDING in this town.
// Groups buildings by tile; stacks (2+ on a tile) are listed first.
// Returns null if the city has no completed buildings.

const ETFI_YIELDS = {
  HAPPINESS: "YIELD_HAPPINESS",
};

export default class TempleDetails {
  render(city) {
    if (!city || !city.Constructibles || !Constructibles || !GameInfo?.Constructibles) {
      return null;
    }

    const constructibles = city.Constructibles;
    const buildingIds = constructibles.getIdsOfClass("BUILDING") || [];
    if (!buildingIds.length) return null;

    const byTile = Object.create(null);
    let totalBuildings = 0;

    for (const instanceId of buildingIds) {
      const inst = Constructibles.get(instanceId);
      if (!inst || !inst.complete) continue;

      const loc = inst.location;
      if (!loc || loc.x == null || loc.y == null) continue;

      const info = GameInfo.Constructibles.lookup(inst.type);
      if (!info) continue;

      const key = `${loc.x},${loc.y}`;
      if (!byTile[key]) byTile[key] = { buildings: [] };

      byTile[key].buildings.push({
        iconId: info.ConstructibleType,
        nameKey: info.Name,
      });

      totalBuildings += 1;
    }

    if (!totalBuildings) return null;

    // Stacks first (descending by count), then singles
    const stacks = Object.values(byTile).sort((a, b) => b.buildings.length - a.buildings.length);
    if (!stacks.length) return null;

    const bullet = "•";
    const labelTotalBuildings = Locale.compose("LOC_MOD_ETFI_TOTAL_BUILDINGS");

    let html = `
      <div class="flex flex-col w-full">
        <div 
          class="flex items-center justify-center gap-4 mb-2 rounded-md px-3 py-2 flex-wrap"
          style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
        >
          <div class="flex items-center gap-2 mr-2">
            <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${totalBuildings}</span>
          </div>
        </div>

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalBuildings}</span>
            <span>${totalBuildings}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    for (const stack of stacks) {
      const arr = stack.buildings || [];
      const bonus = arr.length; // +1 Happiness per building

      // icon | name • icon | name • ...
      let buildingsHtml = "";
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i];
        const name = Locale.compose(b.nameKey);
        if (i > 0) {
          buildingsHtml += `<span class="mx-1">${bullet}</span>`;
        }
        buildingsHtml += `
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <fxs-icon data-icon-id="${b.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${name}</span>
          </span>
        `;
      }

      html += `
        <div class="flex justify-between items-center mt-1">
          <div class="flex items-center gap-2 min-w-0">${buildingsHtml}</div>
          <div class="flex items-center gap-1 ml-3">
            <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${bonus}</span>
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }
}
