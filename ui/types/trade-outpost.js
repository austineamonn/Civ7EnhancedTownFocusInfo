// ui/production-chooser/details/trade-details.js

// Self-contained Trade (resources → Happiness) details renderer.
const ETFI_YIELDS = {
  HAPPINESS: "YIELD_HAPPINESS",
};

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

export default class TradeDetails {
  /**
   * Shows total purchased+center resource tiles and +Happiness from them.
   * - Header: +Happiness total
   * - Summary: Total resource tiles
   * - Rows: one per resource type (icon | name x count | +Happiness)
   * Returns null if no resource tiles are found (caller can render +0 fallback).
   */
  render(city) {
    if (!city || !GameplayMap || !GameInfo?.Resources) return null;

    const cityLocation = city.location;
    const getPurchasedPlots =
      typeof city.getPurchasedPlots === "function"
        ? city.getPurchasedPlots.bind(city)
        : null;

    if (!cityLocation) return null;

    // Collect plots: city center + purchased plots
    const plots = [cityLocation];
    const purchasedPlotIndices = getPurchasedPlots ? getPurchasedPlots() : [];

    if (Array.isArray(purchasedPlotIndices)) {
      for (const plotIndex of purchasedPlotIndices) {
        const plotCoords = GameplayMap.getLocationFromIndex(plotIndex);
        if (plotCoords && plotCoords.x != null && plotCoords.y != null) {
          plots.push(plotCoords);
        }
      }
    }

    const NO_RESOURCE =
      (typeof ResourceTypes !== "undefined" && ResourceTypes.NO_RESOURCE) || 0;

    const resourcesByType = Object.create(null);
    let totalResourceTiles = 0;

    for (const plot of plots) {
      if (!plot || plot.x == null || plot.y == null) continue;

      const resourceType = GameplayMap.getResourceType(plot.x, plot.y);
      if (resourceType === NO_RESOURCE) continue;

      const resourceInfo = GameInfo.Resources.lookup(resourceType);
      if (!resourceInfo) continue;

      const iconId = resourceInfo.ResourceType; // e.g. RESOURCE_IRON
      const name = Locale.compose(resourceInfo.Name);

      if (!resourcesByType[iconId]) {
        resourcesByType[iconId] = { iconId, name, count: 0 };
      }
      resourcesByType[iconId].count += 1;
      totalResourceTiles += 1;
    }

    const items = Object.values(resourcesByType);
    if (!items.length) return null;

    // Trade Outpost rule: +2 Happiness per resource tile
    const happinessPerTile = 2;
    const totalHappiness = totalResourceTiles * happinessPerTile;

    const labelTotalResources = Locale.compose("LOC_MOD_ETFI_TOTAL_RESOURCES");
    const labelPerResource = Locale.compose("LOC_MOD_ETFI_HAPPINESS_PER_RESOURCE");

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeaderBadge(ETFI_YIELDS.HAPPINESS, totalHappiness)}
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalResources}</span>
            <span>${totalResourceTiles}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    for (const item of items) {
      const happinessFromThisResource = item.count * happinessPerTile;
      html += `
        <div class="flex justify-between items-center mt-1">
          <div class="flex items-center gap-2">
            <fxs-icon data-icon-id="${item.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${item.name}</span>
            <span class="opacity-70 ml-1">x${item.count}</span>
          </div>
          <div class="flex items-center gap-1">
            <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${happinessFromThisResource}</span>
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
