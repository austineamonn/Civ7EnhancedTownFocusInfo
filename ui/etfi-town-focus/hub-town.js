// Hub (Inn) details renderer.
// - +1 Influence per connected city/town.
// - Header: total Influence (connections).
// - Body: separate rows for Cities and Towns.

import { ETFI_YIELDS, renderHeader } from "../../etfi-utilities.js";

const ETFI_ICONS = {
  CITY: "CITY_URBAN",
  TOWN: "CITY_RURAL",
};

export default class HubDetails {
  /**
   * Returns HTML for Hub (Inn) focus, or null if no connections.
   * Shows total connections, then breakdown: Cities and Towns.
   */
  render(city) {
    if (!city || !Cities || typeof city.getConnectedCities !== "function") return null;

    const connectedIds = city.getConnectedCities();
    if (!connectedIds || !connectedIds.length) return null;

    const towns = [];
    const citiesList = [];

    for (const id of connectedIds) {
      const settlement = Cities.get(id);
      if (!settlement) continue;
      const name = Locale.compose(settlement.name);
      if (settlement.isTown) {
        towns.push(name);
      } else {
        citiesList.push(name);
      }
    }

    const totalConnections = towns.length + citiesList.length;
    if (totalConnections === 0) return null;

    const labelCities = Locale.compose("LOC_MOD_ETFI_CONNECTED_CITIES");
    const labelTowns = Locale.compose("LOC_MOD_ETFI_CONNECTED_TOWNS");
    const labelTotalConnections = Locale.compose("LOC_MOD_ETFI_TOTAL_CONNECTIONS");

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(ETFI_YIELDS.INFLUENCE, totalConnections)}
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalConnections}</span>
            <span>${totalConnections}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>

          <!-- Cities row -->
          <div class="flex justify-between items-center mt-1">
            <div class="flex items-center gap-2">
              <fxs-icon data-icon-id="${ETFI_ICONS.CITY}" class="size-4"></fxs-icon>
              <span class="opacity-60">| </span>
              <span>${labelCities}</span>
              <span class="opacity-70 ml-1">x${citiesList.length}</span>
            </div>
            <div class="flex items-center gap-2">
              <fxs-icon data-icon-id="${ETFI_YIELDS.INFLUENCE}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${citiesList.length}</span>
            </div>
          </div>
          ${
            citiesList.length
              ? `<div class="ml-6 opacity-80" style="font-size: 0.8em;">${citiesList.join(
                  " • "
                )}</div>`
              : ""
          }

          <!-- Towns row -->
          <div class="flex justify-between items-center mt-1">
            <div class="flex items-center gap-2">
              <fxs-icon data-icon-id="${ETFI_ICONS.TOWN}" class="size-4"></fxs-icon>
              <span class="opacity-60">| </span>
              <span>${labelTowns}</span>
              <span class="opacity-70 ml-1">x${towns.length}</span>
            </div>
            <div class="flex items-center gap-2">
              <fxs-icon data-icon-id="${ETFI_YIELDS.INFLUENCE}" class="size-4"></fxs-icon>
              <span class="font-semibold">+${towns.length}</span>
            </div>
          </div>
          ${
            towns.length
              ? `<div class="ml-6 opacity-80" style="font-size: 0.8em;">${towns.join(
                  " • "
                )}</div>`
              : ""
          }
        </div>
      </div>
    `;

    return html;
  }
}
