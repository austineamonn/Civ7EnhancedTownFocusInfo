
/**
 * Enhanced Town Focus Info Mod - Makes Town Focus Tooltips more informative
 * Author: Zatygold
 * Version: 2.0.0
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.chunk.js';
import { c as GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';

// #region Localization constants
const ETFI_ICONS = {
  CITY: "CITY_URBAN",
  TOWN: "CITY_RURAL"
};

const ETFI_PROJECT_TYPES = {
  TOWN_FARMING:"LOC_PROJECT_TOWN_GRANARY_NAME",
  TOWN_FISHING: "LOC_PROJECT_TOWN_FISHING_NAME",
  TOWN_MINING: "LOC_PROJECT_TOWN_PRODUCTION_NAME",
  TOWN_HUB: "LOC_PROJECT_TOWN_INN_NAME",
  TOWN_TRADE: "LOC_PROJECT_TOWN_TRADE_NAME",
  TOWN_RESORT: "LOC_PROJECT_TOWN_RESORT_NAME",
  TOWN_TEMPLE:"LOC_PROJECT_TOWN_TEMPLE_NAME",
  TOWN_URBAN: "LOC_PROJECT_TOWN_URBAN_CENTER_NAME"
};

const ETFI_YIELDS = {
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  INFLUENCE: "YIELD_DIPLOMACY",
  HAPPINESS: "YIELD_HAPPINESS",
  GOLD: "YIELD_GOLD",
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE"
};

const ETFI_IMPROVEMENTS = {
  displayNames: {
    IMPROVEMENT_WOODCUTTER: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
    IMPROVEMENT_WOODCUTTER_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
    IMPROVEMENT_MINE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
    IMPROVEMENT_MINE_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
    IMPROVEMENT_FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FISHING_BOAT_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FARM: "LOC_MOD_ETFI_IMPROVEMENT_FARM",
    IMPROVEMENT_PASTURE: "LOC_MOD_ETFI_IMPROVEMENT_PASTURE",
    IMPROVEMENT_PLANTATION: "LOC_MOD_ETFI_IMPROVEMENT_PLANTATION",
    IMPROVEMENT_CAMP: "LOC_MOD_ETFI_IMPROVEMENT_CAMP",
    IMPROVEMENT_CLAY_PIT: "LOC_MOD_ETFI_IMPROVEMENT_CLAY_PIT",
    IMPROVEMENT_QUARRY: "LOC_MOD_ETFI_IMPROVEMENT_QUARRY",
  },
  sets: {
    food: new Set([
      "IMPROVEMENT_FARM",
      "IMPROVEMENT_PASTURE",
      "IMPROVEMENT_PLANTATION",
      "IMPROVEMENT_FISHING_BOAT",
      "IMPROVEMENT_FISHING_BOAT_RESOURCE",
    ]),
    production: new Set([
      "IMPROVEMENT_CAMP",
      "IMPROVEMENT_WOODCUTTER",
      "IMPROVEMENT_WOODCUTTER_RESOURCE",
      "IMPROVEMENT_CLAY_PIT",
      "IMPROVEMENT_MINE",
      "IMPROVEMENT_MINE_RESOURCE",
      "IMPROVEMENT_QUARRY",
    ]),
  },
};

// #region Helpers
function getEraMultiplier(base = 1) {
  let multiplier = base;
  const ageData = GameInfo.Ages.lookup(Game.age);
  if (!ageData) return multiplier;

  const ageType = (ageData.AgeType || "").trim();
  if (ageType === "AGE_EXPLORATION") {
    multiplier += 1;
  } else if (ageType === "AGE_MODERN") {
    multiplier += 2;
  }
  return multiplier;
}

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
// #endregion

// #region EtfiToolTipType
const bulletChar = String.fromCodePoint(8226);
class EtfiToolTipType {
    _target = null;
    get target() {
      return this._target?.deref() ?? null;
    }
    set target(value) {
      this._target = value ? new WeakRef(value) : null;
    }
    tooltip = document.createElement("fxs-tooltip");
    icon = document.createElement("fxs-icon");
    header = document.createElement("fxs-header");
    divider = document.createElement("div");
    glow = document.createElement("div");
    description = document.createElement("p");
    detailsContainer = document.createElement("div");  // NEW: extra “details” block (ETFI info)
    productionCost = document.createElement("div");
    requirementsContainer = document.createElement("div");
    requirementsText = document.createElement("div");
    gemsContainer = document.createElement("div");
   
    constructor() {
      this.glow.classList.add(
        "h-24",
        "absolute",
        "inset-x-0",
        "-top-7",
        "img-fxs-header-glow",
        "pointer-events-none"
      );
      this.tooltip.className = "flex w-96 text-accent-2 font-body text-sm";
      this.header.setAttribute("filigree-style", "none");
      this.header.setAttribute("header-bg-glow", "true");
      this.icon.className = "size-12";
      const dividerLeft = document.createElement("div");
      const dividerRight = document.createElement("div");
      dividerLeft.classList.add("filigree-shell-small-left");
      dividerRight.classList.add("filigree-shell-small-right");
      this.divider.className = "flex flex-row items-center self-center";
      this.divider.append(dividerLeft, this.icon, dividerRight);
      this.detailsContainer.className = "flex mt-2 p-2 production-chooser-tooltip__subtext-bg etfi-details"; // NEW: details block
      this.productionCost.className = "mt-2";
      this.requirementsContainer.className = "flex mt-2 p-2 production-chooser-tooltip__subtext-bg";
      this.requirementsContainer.append(this.requirementsText);
      this.gemsContainer.className = "mt-10";
      this.tooltip.append(
        this.glow,
        this.header,
        this.divider,
        this.description,
        this.detailsContainer, // NEW: ETFI details
        this.productionCost,
        this.requirementsContainer,
        this.gemsContainer
      );
    }
    getHTML() {
      return this.tooltip;
    }
    reset() {
      return;
    }
    isUpdateNeeded(target) {
      const newTarget = target.closest("town-focus-chooser-item, production-chooser-item");
      if (this.target === newTarget) {
        return false;
      }
      this.target = newTarget;
      if (!this.target) {
        return false;
      }
      return true;
    }
    getProjectType() {
      if (!this.target) {
        return null;
      }
      if (this.target.hasAttribute("data-project-type")) {
        return Number(this.target.dataset.projectType);
      }
      if (this.target.hasAttribute("data-type")) {
        return Game.getHash(this.target.dataset.type);
      }
      return null;
    }
    getDescription() {
      if (!this.target) return null;
      if (IsElement(this.target, "town-focus-chooser-item")) {
        return this.target.dataset.tooltipDescription ?? null;
      }
      return this.target.dataset.description ?? null;
    }
    update() {
      if (!this.target) {
        console.error("EtfiTooltipType.update: update triggered with no valid target");
        return;
      }
      const projectType = this.getProjectType();
      const cityID = UI.Player.getHeadSelectedCity();
      if (!cityID) { return; }
      const city = Cities.get(cityID);
      if (!city) { return; }
      const name = this.target.dataset.name ?? "";
      const description = (this.target.dataset.tooltipDescription || this.target.dataset.description) ?? "";
      const detailsText = IsElement(this.target, "town-focus-chooser-item") ? this.getDetailsText(city) : void 0;   // NEW: project-specific ETFI data
      const growthType = Number(this.target.dataset.growthType);
      const productionCost = projectType ? city.Production?.getProjectProductionCost(projectType) : -1;
      const requirementsText = this.getRequirementsText();
      this.header.setAttribute("title", name);
      this.description.innerHTML = description ? Locale.stylize(description) : "";
      let firstChild = true;
      let prevChildisList = false;
      for (const node of this.description.children) {
        const isList = Boolean(node.innerHTML.match(bulletChar));
        if (isList) node.classList.add("ml-4");
        if (!firstChild) {
          if (!prevChildisList || !isList) {
            node.classList.add("mt-2");
          }
        } else {
          firstChild = false;
        }
        prevChildisList = isList;
      }
      const iconBlp = GetTownFocusBlp(growthType, projectType);
      this.icon.style.backgroundImage = `url(${iconBlp})`;
      if (productionCost !== void 0 && productionCost > 0) {
        this.productionCost.innerHTML = Locale.stylize(
          "LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST",
          productionCost,
          "YIELD_PRODUCTION"
        );
        this.productionCost.classList.remove("hidden");
      } else {
        this.productionCost.classList.add("hidden");
      }

      // NEW: apply detailsText
      if (detailsText) {
        this.detailsContainer.innerHTML = detailsText;
        this.detailsContainer.classList.remove("hidden");
      } else {
        this.detailsContainer.innerHTML = "";
        this.detailsContainer.classList.add("hidden");
      }

      if (requirementsText) {
        this.requirementsText.innerHTML = requirementsText;
        this.requirementsContainer.classList.remove("hidden");
      } else {
        this.requirementsContainer.classList.add("hidden");
      }

      // NEW: Small fix | clear gemsContainer so it doesn’t stack icons on repeated updates
      while (this.gemsContainer.hasChildNodes()) {
        this.gemsContainer.removeChild(this.gemsContainer.lastChild);
      }
      
      const recommendations = this.target?.dataset.recommendations;
      if (recommendations) {
        const parsedRecommendations = JSON.parse(recommendations);
        const advisorList = parsedRecommendations.map((rec) => rec.class);
        const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
        this.gemsContainer.appendChild(recommendationTooltipContent);
      }
      this.gemsContainer.classList.toggle("hidden", !recommendations);
    }
    // NEW: central dispatcher for ETFI details text
    getDetailsText(city) {
      if (!this.target) return null;

      const projectNameKey = this.target.dataset.name; // e.g. "LOC_PROJECT_TOWN_GRANARY_NAME"
      if (!projectNameKey) return null;

      switch (projectNameKey) {
        case ETFI_PROJECT_TYPES.TOWN_FARMING:
          return this.getFoodFocusDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_FISHING:
          return this.getFoodFocusDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_MINING:
          return this.getMiningDetailsHTML(city);
        
        case ETFI_PROJECT_TYPES.TOWN_HUB:
          return this.getInnDetailsHTML(city);
        
        case ETFI_PROJECT_TYPES.TOWN_TRADE:
          return this.getTradeDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_RESORT:
          return this.getResortDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_TEMPLE:
          return this.getTempleDetailsHTML(city);
        
        case ETFI_PROJECT_TYPES.TOWN_URBAN:
          return this.getUrbanCenterDetailsHTML(city);

        default:
          return null;
      }
    }
    // NEW:
    getImprovementSummaryForSet(city, targetSet, baseMultiplier = 1) {
      if (!city || !city.Constructibles) return null;
      if (!(targetSet instanceof Set) || targetSet.size === 0) return null;
      if (!GameInfo?.Constructibles || !Districts || !Constructibles) return null;

      const resultByDisplayKey = Object.create(null);
      const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];

      for (const instanceId of improvements) {
        const instance = Constructibles.get(instanceId);
        if (!instance) continue;

        const location = instance.location;
        if (!location || location.x == null || location.y == null) continue;

        // Using free constructible so we respect warehouse bonuses etc.
        const fcID = Districts.getFreeConstructible(
          location,
          GameContext.localPlayerID
        );
        const fcInfo = GameInfo.Constructibles.lookup(fcID);
        if (!fcInfo) continue;

        const logicalType = fcInfo.ConstructibleType;
        if (!targetSet.has(logicalType)) continue;

        // 2) Use the *instance* constructible for display (real improvement)
        const info = GameInfo.Constructibles.lookup(instance.type);
        const ctype = info?.ConstructibleType || logicalType;


        const displayKey = ETFI_IMPROVEMENTS.displayNames[ctype] || info.Name || ctype;

        if (!resultByDisplayKey[displayKey]) {
          resultByDisplayKey[displayKey] = {
            key: displayKey,
            ctype,
            iconId: ctype,
            displayName: Locale.compose(displayKey),
            count: 0,
          };
        }

        resultByDisplayKey[displayKey].count += 1;
      }

      const items = Object.values(resultByDisplayKey);
      if (!items.length) return null;

      const baseTotal = items.reduce((sum, item) => sum + item.count, 0);
      const multiplier = getEraMultiplier(baseMultiplier);
      const total = baseTotal * multiplier;

      return { items, total, multiplier, baseCount: baseTotal };
    }
    // NEW:
    renderImprovementDetailsHTML(summary, yieldIconId) {
      if (!summary) return null;
    
      const { items, total, multiplier, baseCount } = summary;
      const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");
    
      let html = `
        <div class="flex flex-col w-full">
          ${renderHeaderBadge(yieldIconId, total)}
      `;

      // Breakdown per improvement type (+ new Total Improvements row)
      html += `
      <div 
        class="mt-1 text-accent-2"
        style="font-size: 0.8em; line-height: 1.4;"
      >
        <div class="flex justify-between mb-1">
          <span>${labelTotalImprovements}</span>
          <span>${(typeof baseCount === "number" ? baseCount : Math.round(total / (multiplier || 1)))}</span>
        </div>
        <div class="mt-1 border-t border-white/10"></div>
      `;

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
      html += `</div>`;

      html += `</div>`;
      return html;
    }
    // NEW: 
    getFoodFocusDetailsHTML(city) {
      const summary = this.getImprovementSummaryForSet(
        city, ETFI_IMPROVEMENTS.sets.food
      );
      if (!summary) return null;
    
      return this.renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
    }
    // NEW:
    getMiningDetailsHTML(city) {
      const summary = this.getImprovementSummaryForSet(
        city, ETFI_IMPROVEMENTS.sets.production, 2                                   
      );
      if (!summary) return null;
    
      return this.renderImprovementDetailsHTML(summary, ETFI_YIELDS.PRODUCTION);
    }
    // NEW:
    getInnDetailsHTML(city) {
      if (!city || typeof city.getConnectedCities !== "function") return null;

      const connectedIds = city.getConnectedCities();
      if (!connectedIds || !connectedIds.length) {
        return null;
      }

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

      const labelCities = Locale.compose("LOC_MOD_ETFI_CONNECTED_CITIES");
      const labelTowns  = Locale.compose("LOC_MOD_ETFI_CONNECTED_TOWNS");
      const labelTotalConnections = Locale.compose("LOC_MOD_ETFI_TOTAL_CONNECTIONS");

      let html = `
        <div class="flex flex-col w-full">
          ${renderHeaderBadge(ETFI_YIELDS.INFLUENCE, totalConnections)}
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
            <div class="flex justify-between mb-1">
              <span>${labelTotalConnections}</span>
              <span>${totalConnections}</span>
            </div>
            <div class="mt-1 border-t border-white/10"></div>
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
      `;

      if (citiesList.length) {
        html += `
            <div class="ml-6 opacity-80" style="font-size: 0.8em;">
              ${citiesList.join(" • ")}
            </div>
        `;
      }

      html += `
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
      `;

      if (towns.length) {
        html += `
            <div class="ml-6 opacity-80" style="font-size: 0.8em;">
              ${towns.join(" • ")}
            </div>
        `;
      }

      html += `
          </div>
        </div>
      `;

      return html;
    }
    getTradeDetailsHTML(city){
      if (!city || !GameplayMap || !GameInfo?.Resources) return null;

      const cityLocation = city.location;
      const getPurchasedPlots =
        typeof city.getPurchasedPlots === "function"
          ? city.getPurchasedPlots.bind(city)
          : null;
    
      if (!cityLocation) return null;
    
      // Collect all plots: city center + purchased plots
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
    
        const iconId = resourceInfo.ResourceType;      // e.g. RESOURCE_IRON
        const name   = Locale.compose(resourceInfo.Name);
    
        if (!resourcesByType[iconId]) {
          resourcesByType[iconId] = {
            iconId,
            name,
            count: 0,
          };
        }
    
        resourcesByType[iconId].count += 1;
        totalResourceTiles += 1;
      }
    
      const items = Object.values(resourcesByType);
      if (!items.length) return null;
    
      // Trade Outpost: flat +2 Happiness per resource tile
      const happinessPerTile = 2;
      const totalHappiness   = totalResourceTiles * happinessPerTile;
    
      const labelTotalResources = Locale.compose("LOC_MOD_ETFI_TOTAL_RESOURCES");
      const labelPerResource    = Locale.compose("LOC_MOD_ETFI_HAPPINESS_PER_RESOURCE");
    
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

      // Close opened containers for valid HTML
      html += `
            </div>
          </div>
      `;
      return html;
    }
    getResortDetailsHTML(city) {
      if (!city || !city.Constructibles || !GameplayMap || !GameInfo?.Constructibles || !GameInfo?.Features || !GameInfo?.Yields) {
        return null;
      }

      const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];
      if (!improvements.length) return null;

      const multiplier = getEraMultiplier();

      const improvementBuckets = Object.create(null); // non-wonder tiles w/ ≥1 base Happiness
      const wonderBuckets = Object.create(null);      // wonder tiles grouped by wonder name
      const globalDeltas = Object.create(null);       // total extra yields from Resort

      function addToGlobal(yType, amount) {
        if (!amount) return;
        globalDeltas[yType] = (globalDeltas[yType] || 0) + amount;
      }

      for (const instanceId of improvements) {
        const instance = Constructibles.get(instanceId);
        if (!instance) continue;

        const loc = instance.location;
        if (!loc || loc.x == null || loc.y == null) continue;
        const { x, y } = loc;

        const isNW = GameplayMap.isNaturalWonder(x, y);

        // ── 1) Base yields for this tile ───────────────────────────────────────
        const baseYields = Object.create(null);
        for (const yInfo of GameInfo.Yields) {
          const amt = GameplayMap.getYield(
            x,
            y,
            yInfo.YieldType,
            GameContext.localPlayerID
          );
          if (amt !== 0) {
            baseYields[yInfo.YieldType] = amt;
          }
        }

        const happyBase = baseYields[ETFI_YIELDS.HAPPINESS] || 0;

        // If tile has literally no yields and no happiness, Resort adds nothing.
        if (!isNW && happyBase <= 0) {
          continue;
        }

        // Start from base yields and apply Resort effects
        const tileYields = Object.create(null);
        for (const yType in baseYields) {
          tileYields[yType] = baseYields[yType];
        }

        // ── 2) Per-age H & G on tiles with ≥1 base Happiness ───────────────────
        if (happyBase > 0) {
          tileYields[ETFI_YIELDS.HAPPINESS] =
            (tileYields[ETFI_YIELDS.HAPPINESS] || 0) + multiplier;
          tileYields[ETFI_YIELDS.GOLD] =
            (tileYields[ETFI_YIELDS.GOLD] || 0) + multiplier;
        }

        // ── 3) +50% yields on Natural Wonders (after per-age bonuses) ──────────
        if (isNW) {
          for (const yType in tileYields) {
            tileYields[yType] *= 1.5;
          }
        }

        // ── 4) Delta = final - base (Resort’s actual contribution) ─────────────
        const deltaYields = Object.create(null);
        let hasDelta = false;
        for (const yInfo of GameInfo.Yields) {
          const yType = yInfo.YieldType;
          const base = baseYields[yType] || 0;
          const fin = tileYields[yType] || 0;
          const delta = fin - base;
          if (Math.abs(delta) > 1e-6) {
            deltaYields[yType] = delta;
            hasDelta = true;
            addToGlobal(yType, delta);
          }
        }

        if (!hasDelta) continue;

        // ── Bucket by wonder vs. improvement ────────────────────────────────────
        if (isNW) {
          // Natural Wonder tile: group by wonder name, use improvement icon if possible
          const fType = GameplayMap.getFeatureType(x, y);
          const fInfo = GameInfo.Features.lookup(fType);
          const wonderName = Locale.compose(fInfo?.Name) || "Natural Wonder";

          const cinfo = GameInfo.Constructibles.lookup(instance.type);
          const ctype = cinfo?.ConstructibleType;
          const iconId = ctype || fInfo?.FeatureType;

          let wb = wonderBuckets[wonderName];
          if (!wb) {
            wb = {
              key: wonderName,
              iconId,
              count: 0,
              yields: Object.create(null), // delta yields
            };
            wonderBuckets[wonderName] = wb;
          }
          wb.count += 1;

          for (const yType in deltaYields) {
            const val = deltaYields[yType];
            wb.yields[yType] = (wb.yields[yType] || 0) + val;
          }
        } else if (happyBase > 0) {
          // Non-wonder happy tile: group by improvement, show extra H & G
          const cinfo = GameInfo.Constructibles.lookup(instance.type);
          const ctype = cinfo?.ConstructibleType;
          const displayKey =
            ETFI_IMPROVEMENTS.displayNames[ctype] || cinfo?.Name || ctype || "LOC_UNKNOWN";

          let ib = improvementBuckets[displayKey];
          if (!ib) {
            ib = {
              key: displayKey,
              iconId: ctype,
              displayName: Locale.compose(displayKey),
              count: 0,
              deltaH: 0,
              deltaG: 0,
            };
            improvementBuckets[displayKey] = ib;
          }
          ib.count += 1;
          ib.deltaH += deltaYields[ETFI_YIELDS.HAPPINESS] || 0;
          ib.deltaG += deltaYields[ETFI_YIELDS.GOLD] || 0;
        }
      }

      const improvementItems = Object.values(improvementBuckets);
      const wonderItems = Object.values(wonderBuckets);

      if (!Object.keys(globalDeltas).length) {
        return null;
      }

      // ── Build header from global deltas (Resort effect only) ─────────────────
      const headerOrder = [
        ETFI_YIELDS.HAPPINESS,
        ETFI_YIELDS.GOLD,
        ETFI_YIELDS.FOOD,
        ETFI_YIELDS.PRODUCTION,
        ETFI_YIELDS.SCIENCE,
        ETFI_YIELDS.CULTURE,
      ];

      // --- Inserted: label and base-count for improvements ---
      const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");
      const baseTotalImprovements = improvementItems.reduce((sum, it) => sum + (it.count || 0), 0);
      const totalWonderTiles = wonderItems.reduce((sum, w) => sum + (w.count || 0), 0);
      const baseTotalAllTiles = baseTotalImprovements + totalWonderTiles;

      let headerYieldsHtml = "";
      for (const yType of headerOrder) {
        const val = globalDeltas[yType];
        if (!val) continue;
        const displayVal =
          Math.abs(val - Math.round(val)) < 1e-6 ? Math.round(val) : val.toFixed(1);
        headerYieldsHtml += `
          <div class="flex items-center gap-2 mr-2">
            <fxs-icon data-icon-id="${yType}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${displayVal}</span>
          </div>
        `;
      }

      let html = `
        <div class="flex flex-col w-full">
          <div
            class="flex items-center justify-center gap-4 mb-2 rounded-md px-3 py-2 flex-wrap"
            style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
          >
            ${headerYieldsHtml}
          </div>
      `;

      // ── Improvements summary + breakdown (non-wonder, happy tiles) ───────────
      html += `
        <div
          class="mt-1 text-accent-2"
          style="font-size: 0.8em; line-height: 1.4;"
        >
          <div class="flex justify-between mb-1">
            <span>${labelTotalImprovements}</span>
            <span>${baseTotalAllTiles}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
      `;

      if (improvementItems.length) {
        for (const item of improvementItems) {
          const hVal =
            Math.abs(item.deltaH - Math.round(item.deltaH)) < 1e-6
              ? Math.round(item.deltaH)
              : item.deltaH.toFixed(1);
          const gVal =
            Math.abs(item.deltaG - Math.round(item.deltaG)) < 1e-6
              ? Math.round(item.deltaG)
              : item.deltaG.toFixed(1);

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
      }

      html += `</div>`;

      // ── Natural Wonders breakdown: icon | name x count + all extra yields ────
      if (wonderItems.length) {
        const labelNaturalWonder =
          Locale.compose("LOC_MOD_ETFI_NATURAL_WONDER") || "Natural Wonder";

        // New: only show the "Natural Wonder" label if there are non-wonder improvements
        const showWonderLabel = improvementItems.length > 0;

        html += `
          <div class="mt-2" style="font-size: 0.8em; line-height: 1.4;">
        `;

        for (const w of wonderItems) {
          const yields = w.yields || {};
          let yieldsHtml = "";

          // Order: Happiness, Gold, then all others
          const primaryOrder = [ETFI_YIELDS.HAPPINESS, ETFI_YIELDS.GOLD];
          const secondaryOrder = [];
          for (const yInfo of GameInfo.Yields) {
            const yType = yInfo.YieldType;
            if (primaryOrder.indexOf(yType) !== -1) continue;
            secondaryOrder.push(yType);
          }
          const orderedYields = primaryOrder.concat(secondaryOrder);

          for (const yType of orderedYields) {
            const val = yields[yType];
            if (!val) continue;
            const displayVal =
              Math.abs(val - Math.round(val)) < 1e-6 ? Math.round(val) : val.toFixed(1);
            yieldsHtml += `
              <span class="inline-flex items-center gap-2 mr-1">
                <fxs-icon data-icon-id="${yType}" class="size-4"></fxs-icon>
                <span>+${displayVal}</span>
              </span>
            `;
          }

          html += `
            <div class="mt-2">
          `;

          if (showWonderLabel) {
            html += `
              <!-- Label on its own line -->
              <div class="text-white/90" style="font-size: 0.75em;">
                ${labelNaturalWonder}
              </div>
              <!-- Divider -->
              <div class="mt-1 mb-1 border-t border-white/10"></div>
            `;
          }

          html += `
              <!-- Improvement details row -->
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
    getTempleDetailsHTML(city) {
      if (!city || !city.Constructibles || !Constructibles || !GameInfo?.Constructibles) {
        return null;
      }

      const constructibles = city.Constructibles;
      const buildingIds = constructibles.getIdsOfClass("BUILDING") || [];

      const byTile = Object.create(null);
      let totalBuildings = 0;

      for (const instanceId of buildingIds) {
        const instance = Constructibles.get(instanceId);
        if (!instance) continue;
        if (!instance.complete) continue; // only completed buildings

        const loc = instance.location;
        if (!loc || loc.x == null || loc.y == null) continue;

        const info = GameInfo.Constructibles.lookup(instance.type);
        if (!info) continue;

        const key = `${loc.x},${loc.y}`;

        if (!byTile[key]) {
          byTile[key] = {
            buildings: [], // { iconId, nameKey }
          };
        }

        byTile[key].buildings.push({
          iconId: info.ConstructibleType,
          nameKey: info.Name,
        });

        totalBuildings += 1;
      }

      if (!totalBuildings) return null;

      // === NEW: sort so tiles with 2+ buildings come first ===
      const stacks = Object.values(byTile).sort(
        (a, b) => b.buildings.length - a.buildings.length
      );
      if (!stacks.length) return null;

      const bullet = "•";

      // --- Inserted: label for total buildings ---
      const labelTotalBuildings = Locale.compose("LOC_MOD_ETFI_TOTAL_BUILDINGS");

      // Header: +1 Happiness per building in this town
      let html = `
        <div class="flex flex-col w-full">
          ${renderHeaderBadge(ETFI_YIELDS.HAPPINESS, totalBuildings)}
          <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
            <div class="flex justify-between mb-1">
              <span>${labelTotalBuildings}</span>
              <span>${totalBuildings}</span>
            </div>
            <div class="mt-1 border-t border-white/10"></div>
      `;

      for (const stack of stacks) {
        const buildingsOnTile = stack.buildings || [];
        const bonus = buildingsOnTile.length; // +1 Happiness per building

        // Build "icon | name • icon | name • icon | name"
        let buildingsHtml = "";
        for (let i = 0; i < buildingsOnTile.length; i++) {
          const b = buildingsOnTile[i];
          const name = Locale.compose(b.nameKey);

          if (i > 0) {
            buildingsHtml += `
              <span class="mx-1">${bullet}</span>
            `;
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
            <div class="flex items-center gap-2 min-w-0">
              ${buildingsHtml}
            </div>
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
    getUrbanCenterDetailsHTML(city) {
      if (!city?.Constructibles || !Constructibles || !GameInfo?.Constructibles || !GameInfo?.Yields) {
        return null;
      }
    
      const constructibles = city.Constructibles;
      const buildingIds = constructibles.getIdsOfClass("BUILDING") || [];
      if (!buildingIds.length) return null;
    
      // +100% towards => 50% discount
      const DISCOUNT = 1 - 1 / (1 + 1.0);
    
      // one-decimal, trim trailing .0
      function fmt1(x) {
        const v = Math.round(x * 10) / 10;
        return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
      }
    
      const ORDERED_YIELDS = [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS];
    
      const withMaint = [];
      const withoutMaint = [];
      const grandTotals = { [ETFI_YIELDS.GOLD]: 0, [ETFI_YIELDS.HAPPINESS]: 0 };
    
      for (const id of buildingIds) {
        const inst = Constructibles.get(id);
        if (!inst || !inst.complete) continue;
    
        const info = GameInfo.Constructibles.lookup(inst.type);
        if (!info) continue;
    
        const loc = inst.location;
        if (!loc || loc.x == null || loc.y == null) continue;
        const quarterKey = `${loc.x},${loc.y}`;
    
        const maint = constructibles.getMaintenance(inst.type) || {};
        let g = 0, h = 0;
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
    
        const rec = { quarterKey, iconId: info.ConstructibleType, nameKey: info.Name, g, h };
        if (g > 0 || h > 0) {
          grandTotals[ETFI_YIELDS.GOLD] += g;
          grandTotals[ETFI_YIELDS.HAPPINESS] += h;
          withMaint.push(rec);
        } else {
          withoutMaint.push({ ...rec, g: 0, h: 0 });
        }
      }
    
      if (!withMaint.length && !withoutMaint.length) return null;
    
      // Sort within each section to keep quarters adjacent and most valuable first
      withMaint.sort((a, b) => {
        if (a.quarterKey !== b.quarterKey) return a.quarterKey.localeCompare(b.quarterKey);
        const ta = a.g + a.h, tb = b.g + b.h;
        return tb - ta;
      });
      withoutMaint.sort((a, b) => {
        if (a.quarterKey !== b.quarterKey) return a.quarterKey.localeCompare(b.quarterKey);
        // alphabetical by name if same quarter
        return Locale.compose(a.nameKey).localeCompare(Locale.compose(b.nameKey));
      });
    
      // Group by quarter *per section*, but only merge rows if that quarter has 2+ buildings in that section
      function groupByQuarter(items) {
        const map = new Map();
        for (const it of items) {
          if (!map.has(it.quarterKey)) map.set(it.quarterKey, []);
          map.get(it.quarterKey).push(it);
        }
        return map;
      }
    
      function renderRowsForSection(items) {
        const byQ = groupByQuarter(items);
        let html = "";
    
        for (const [qKey, arr] of byQ) {
          if (arr.length >= 2) {
            // Render grouped row: left = concatenated buildings with bullets, right = summed yields
            const namesInline = arr
              .map((b) => `
                <span class="inline-flex items-center gap-2 whitespace-nowrap">
                  <fxs-icon data-icon-id="${b.iconId}" class="size-5"></fxs-icon>
                  <span class="opacity-60">| </span>
                  <span>${Locale.compose(b.nameKey)}</span>
                </span>
              `.trim())
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
            // Single row as before
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
      }
    
      // Header chips (standard spacing)
      let headerYieldsHtml = "";
      for (const yType of ORDERED_YIELDS) {
        const val = grandTotals[yType] || 0;
        headerYieldsHtml += `
          <div class="flex items-center gap-2 mr-2">
            <fxs-icon data-icon-id="${yType}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${fmt1(val)}</span>
          </div>
        `;
      }
    
      const labelWithMaint = Locale.compose("LOC_MOD_ETFI_BUILDINGS_WITH_MAINTENANCE") || "Buildings with Maintenance";
      const labelWithoutMaint = Locale.compose("LOC_MOD_ETFI_BUILDINGS_WITHOUT_MAINTENANCE") || "Buildings without Maintenance";
    
      function renderSection(items, label) {
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
      }
    
      return `
        <div class="flex flex-col w-full">
          <div
            class="flex items-center justify-center gap-4 mb-2 rounded-md px-3 py-2 flex-wrap"
            style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
          >
            ${headerYieldsHtml}
          </div>
    
          ${renderSection(withMaint, labelWithMaint)}
    
          <div class="mt-3"></div>
    
          ${renderSection(withoutMaint, labelWithoutMaint)}
        </div>
      `;
    }
    getRequirementsText() {
      const projectType = this.getProjectType() ?? -1;
      const project = GameInfo.Projects.lookup(projectType);
      if (!project) {
        return null;
      }
      if (project.PrereqPopulation > 0) {
        return Locale.compose("LOC_UI_PRODUCTION_REQUIRES_POPULATION", project.PrereqPopulation);
      }
      if (project.PrereqConstructible) {
        const definition = GameInfo.Constructibles.lookup(project.PrereqConstructible);
        if (definition) {
          return Locale.compose("LOC_UI_PRODUCTION_REQUIRES_CONSTRUCTIBLE", Locale.compose(definition.Name));
        }
      }
      return null;
    }
    isBlank() {
      return !this.target;
    }
}
// #endregion

// IMPORTANT: this overrides the existing handler for *only* this tooltip type.
TooltipManager.registerType("production-project-tooltip", new EtfiToolTipType());

export { EtfiToolTipType as default };
