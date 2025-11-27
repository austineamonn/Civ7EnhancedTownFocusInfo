// Author: Zatygold
// ui/town-focus/urban-town.js

// Urban Center: "+100% towards" => effective 50% discount on maintenance.
// Shows GOLD and HAPPINESS savings from completed buildings that have maintenance.
// Single section: Buildings with maintenance, grouped by quarter.
// Returns null when there are no completed maintenance buildings.

import { ETFI_YIELDS, fmt1, renderHeader } from "../../etfi-utilities.js";

export default class UrbanCenterDetails {
  render(city) {
    if (!city?.Constructibles || !Constructibles || !GameInfo?.Constructibles || !GameInfo?.Yields) {
      return null;
    }

    const constructibles = city.Constructibles;
    const buildingIds = constructibles.getIdsOfClass("BUILDING") || [];
    if (!buildingIds.length) return null;

    // +100% towards => 1 - 1/(1+1.0) = 0.5 (50% discount)
    const DISCOUNT = 1 - 1 / (1 + 1.0);

    const ORDERED_YIELDS = [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS];

    const withMaint = [];
    const grandTotals = {
      [ETFI_YIELDS.GOLD]: 0,
      [ETFI_YIELDS.HAPPINESS]: 0,
    };

    for (const id of buildingIds) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;

      const info = GameInfo.Constructibles.lookup(inst.type);
      if (!info) continue;

      const loc = inst.location;
      if (!loc || loc.x == null || loc.y == null) continue;
      const quarterKey = `${loc.x},${loc.y}`;

      const maint = constructibles.getMaintenance(inst.type) || {};
      let g = 0;
      let h = 0;

      for (const yi in maint) {
        const raw = Number(maint[yi]) || 0;
        if (raw <= 0) continue;

        const yInfo = GameInfo.Yields[yi];
        if (!yInfo) continue;

        const yType = yInfo.YieldType;
        const saved = raw * DISCOUNT;

        if (yType === ETFI_YIELDS.GOLD) g += saved;
        if (yType === ETFI_YIELDS.HAPPINESS) h += saved;
      }

      // Only care about buildings where the discount actually yields something
      if (g <= 0 && h <= 0) continue;

      grandTotals[ETFI_YIELDS.GOLD] += g;
      grandTotals[ETFI_YIELDS.HAPPINESS] += h;

      withMaint.push({
        quarterKey,
        iconId: info.ConstructibleType,
        nameKey: info.Name,
        g,
        h,
      });
    }

    // Keep quarters adjacent; buildings-with-maint first by value
    withMaint.sort((a, b) => {
      if (a.quarterKey !== b.quarterKey) return a.quarterKey.localeCompare(b.quarterKey);
      const ta = a.g + a.h;
      const tb = b.g + b.h;
      return tb - ta;
    });

    // Group by quarter within the section; merge rows if that quarter has 2+ items
    const renderRowsForSection = (items) => {
      const byQ = new Map();
      for (const it of items) {
        if (!byQ.has(it.quarterKey)) byQ.set(it.quarterKey, []);
        byQ.get(it.quarterKey).push(it);
      }

      let html = "";
      for (const [, arr] of byQ) {
        if (arr.length >= 2) {
          const namesInline = arr
            .map(
              (b) => `
              <span class="inline-flex items-center gap-2 whitespace-nowrap">
                <fxs-icon data-icon-id="${b.iconId}" class="size-5"></fxs-icon>
                <span class="opacity-60">| </span>
                <span>${Locale.compose(b.nameKey)}</span>
              </span>
            `.trim()
            )
            .join(`<span class="mx-1">•</span>`);

          const sumG = arr.reduce((s, x) => s + (x.g || 0), 0);
          const sumH = arr.reduce((s, x) => s + (x.h || 0), 0);

          const right = `
            <span class="inline-flex items-center gap-1">
              <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${fmt1(sumG)}</span>
            </span>
            <span class="inline-flex items-center gap-1 ml-2">
              <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${fmt1(sumH)}</span>
            </span>
          `;

          html += `
            <div class="flex justify-between items-center mt-1">
              <div class="flex items-center gap-2 min-w-0">${namesInline}</div>
              <div class="flex items-center gap-2 flex-wrap justify-end">${right}</div>
            </div>
          `;
        } else {
          const b = arr[0];

          const left = `
            <span class="inline-flex items-center gap-2 whitespace-nowrap">
              <fxs-icon data-icon-id="${b.iconId}" class="size-5"></fxs-icon>
              <span class="opacity-60">| </span>
              <span>${Locale.compose(b.nameKey)}</span>
            </span>
          `;

          const right = `
            <span class="inline-flex items-center gap-1">
              <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${fmt1(b.g)}</span>
            </span>
            <span class="inline-flex items-center gap-1 ml-2">
              <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${fmt1(b.h)}</span>
            </span>
          `;

          html += `
            <div class="flex justify-between items-center mt-1">
              <div class="flex items-center gap-2 min-w-0">${left}</div>
              <div class="flex items-center gap-2 flex-wrap justify-end">${right}</div>
            </div>
          `;
        }
      }
      return html;
    };

    const labelWithMaint = Locale.compose("LOC_MOD_ETFI_BUILDINGS_WITH_MAINTENANCE") || "Buildings with Maintenance";

    const renderSection = (items, label) => {
      const count = items.length;

      return `
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${label}</span>
            <span>${count}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
          ${renderRowsForSection(items)}
        </div>
      `;
    };

    // Render header
    const headerYieldsHtml = renderHeader(ORDERED_YIELDS, grandTotals);

    return `
      <div class="flex flex-col w-full">
        ${headerYieldsHtml}
        ${withMaint.length > 0 ? renderSection(withMaint, labelWithMaint) : ""}
      </div>
    `;
  }
}
