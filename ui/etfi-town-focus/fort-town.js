// ui/production-chooser/details/fort-town.js
//
// Fort Town: purely cosmetic focus.
// It just shows a header pill with the Fortify icon and "+0" to match
// the look of other town headers, but doesn't list any detail rows.

import { ETFI_YIELDS, renderHeader } from "../../etfi-utilities.js";

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
    const value = 25;
    const headerHtml = renderHeader([ETFI_YIELDS.FORTIFY], value);

    return `
      <div class="flex flex-col w-full">
        ${headerHtml}
      </div>
    `;
  }
}
