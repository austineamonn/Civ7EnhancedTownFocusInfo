
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
const ETFI_PROJECT_TYPES = {
  TOWN_FARMING:"LOC_PROJECT_TOWN_GRANARY_NAME",
  TOWN_FISHING: "LOC_PROJECT_TOWN_FISHING_NAME",
  TOWN_MINING: "LOC_PROJECT_TOWN_PRODUCTION_NAME",
  TOWN_HUB: "LOC_PROJECT_TOWN_INN_NAME",
  TOWN_TRADE: "LOC_PROJECT_TOWN_TRADE_NAME",
  TOWN_RESORT: "LOC_PROJECT_TOWN_RESORT_NAME"
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
        console.error("ProductionProjectTooltipType.update: update triggered with no valid target");
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
      if (!this.target) return void 0;

      const projectNameKey = this.target.dataset.name; // e.g. "LOC_PROJECT_TOWN_GRANARY_NAME"
      if (!projectNameKey) return void 0;

      switch (projectNameKey) {
        case ETFI_PROJECT_TYPES.TOWN_FARMING:
          return this.getGranaryDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_FISHING:
          return this.getFishingDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_MINING:
          return this.getMiningDetailsHTML(city);
        
        case ETFI_PROJECT_TYPES.TOWN_HUB:
          return this.getInnDetailsHTML(city);
        
        case ETFI_PROJECT_TYPES.TOWN_TRADE:
          return this.getTradeDetailsHTML(city);

        case ETFI_PROJECT_TYPES.TOWN_RESORT:
          return this.getResortDetailsHTML(city);

        default:
          return void 0;
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
    
      return { items, total, multiplier };
    }
    // NEW:
    renderImprovementDetailsHTML(summary, yieldIconId) {
      if (!summary) return void 0;

      const { items, total, multiplier } = summary;
    
      let html = `
        <div class="flex flex-col w-full">
          <div             
            class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2"
            style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
          >
            <fxs-icon data-icon-id="${yieldIconId}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${total}</span>
          </div>
      `;
    
      // Breakdown per improvement type
      html += `
      <div 
        class="mt-1 text-accent-2"
        style="font-size: 0.8em; line-height: 1.4;"
      >`;
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
    
      // html += `
      //   <div 
      //     class="flex justify-between mt-1 pt-1 border-t border-white/10text-accent-2"
      //     style="font-size: 0.8em; line-height: 1.4;"
      //   >
      //     <span>${Locale.compose("LOC_MOD_ETFI_ERA_BONUS")}</span>
      //     <span>x${multiplier}</span>
      //   </div>
      // `;
    
      html += `</div>`;
      return html;
    }
    // NEW: 
    getGranaryDetailsHTML(city) {
      const summary = this.getImprovementSummaryForSet(
        city, ETFI_IMPROVEMENTS.sets.food
      );
      if (!summary) return void 0;
    
      return this.renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
    }
    // NEW:
    getFishingDetailsHTML(city) {
      const summary = this.getImprovementSummaryForSet(
        city, ETFI_IMPROVEMENTS.sets.food
      );
      if (!summary) return void 0;
    
      return this.renderImprovementDetailsHTML(summary, ETFI_YIELDS.FOOD);
    }
    // NEW:
    getMiningDetailsHTML(city) {
      const summary = this.getImprovementSummaryForSet(
        city, ETFI_IMPROVEMENTS.sets.production, 2                                   
      );
      if (!summary) return void 0;
    
      return this.renderImprovementDetailsHTML(summary, ETFI_YIELDS.PRODUCTION);
    }
    // NEW:
    getInnDetailsHTML(city) {
      if (!city || typeof city.getConnectedCities !== "function") return void 0;

      const connectedIds = city.getConnectedCities();
      if (!connectedIds || !connectedIds.length) {
        // You *could* still show +0 here if you want, but returning void 0 falls back to vanilla.
        return void 0;
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
    
      // Build localized labels (using your v1 keys)
      const labelConnections = Locale.compose("LOC_MOD_ETFI_TRADE_CONNECTIONS");
      const labelCities      = Locale.compose("LOC_MOD_ETFI_CONNECTED_CITIES");
      const labelTowns       = Locale.compose("LOC_MOD_ETFI_CONNECTED_TOWNS");
    
      let html = `
        <div class="flex flex-col w-full">
          <div             
            class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2"
            style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
          >
            <fxs-icon data-icon-id="${ETFI_YIELDS.INFLUENCE}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${totalConnections}</span>
          </div>

          <div 
            class="mt-1 text-accent-2"
            style="font-size: 0.8em; line-height: 1.4;"
          >
            <div class="mb-1">${labelConnections}</div>

            <div class="flex justify-between">
            <span>${labelCities}</span>
            <span>${citiesList.length}</span>
          </div>
      `;

      if (citiesList.length) {
        html += `
          <div class="ml-3 opacity-80">
            ${citiesList.join(", ")}
          </div>
        `;
      }

      html += `
        <div class="flex justify-between mt-1">
          <span>${labelTowns}</span>
          <span>${towns.length}</span>
        </div>
      `;

      if (towns.length) {
        html += `
          <div class="ml-3 opacity-80">
            ${towns.join(", ")}
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
      if (!city || !GameplayMap || !GameInfo?.Resources) return void 0;

      const cityLocation = city.location;
      const getPurchasedPlots =
        typeof city.getPurchasedPlots === "function"
          ? city.getPurchasedPlots.bind(city)
          : null;
    
      if (!cityLocation) return void 0;
    
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
      if (!items.length) return void 0;
    
      // Trade Outpost: flat +2 Happiness per resource tile
      const happinessPerTile = 2;
      const totalHappiness   = totalResourceTiles * happinessPerTile;
    
      const labelTotalResources = Locale.compose("LOC_MOD_ETFI_TOTAL_RESOURCES");
      const labelPerResource    = Locale.compose("LOC_MOD_ETFI_HAPPINESS_PER_RESOURCE");
    
      let html = `
        <div class="flex flex-col w-full">
          <div 
            class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2"
            style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
          >
            <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-6"></fxs-icon>
            <span class="font-semibold">+${totalHappiness}</span>
          </div>
    
          <div 
            class="mt-1 text-accent-2"
            style="font-size: 0.8em; line-height: 1.4;"
          >
            <div class="flex justify-between mb-1">
              <span>${labelTotalResources}</span>
              <span>${totalResourceTiles}</span>
            </div>
      `;
    
      for (const item of items) {
        const happinessFromThisResource = item.count * happinessPerTile;
    
        html += `
          <div class="flex justify-between items-center mt-1">
            <div class="flex items-center gap-2">
              <fxs-icon data-icon-id="${item.iconId}" class="size-5"></fxs-icon>
              <span class="opacity-60">|</span>
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
            <div class="flex justify-between mt-2 pt-1 border-t border-white/10">
              <span>${labelPerResource}</span>
              <span>x${happinessPerTile}</span>
            </div>
          </div>
        </div>
      `;
      return html;
    }
    // NEW: 
    getResortDetailsHTML(city) {
      if (!city || !city.Constructibles || !GameplayMap || !GameInfo?.Constructibles || !GameInfo?.Features || !GameInfo?.Yields) {
        return void 0;
      }

      const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];
      if (!improvements.length) return void 0;

      const multiplier = getEraMultiplier(); // +1/+2/+3 per Age

      const improvementBuckets = Object.create(null); // non-wonder tiles, grouped by improvement
      const wonderBuckets = Object.create(null);      // wonder tiles, grouped by wonder name
      const wonderYieldsByName = new Map();          // name -> Map(yieldType -> base tile yield)
      const naturalWonderYields = new Map();         // total base yields from all wonders

      let qualifyingTileCount = 0; // rural tiles with ≥1 Happiness
      let nwHappyTiles = 0;        // happy tiles that are also natural wonders

      for (const instanceId of improvements) {
        const instance = Constructibles.get(instanceId);
        if (!instance) continue;

        const loc = instance.location;
        if (!loc || loc.x == null || loc.y == null) continue;
        const { x, y } = loc;

        const happy = GameplayMap.getYield(
          x,
          y,
          typeof HAPPINESS_YIELD !== "undefined"
            ? HAPPINESS_YIELD
            : ETFI_YIELDS.HAPPINESS,
          GameContext.localPlayerID
        );

        const isNW = GameplayMap.isNaturalWonder(x, y);

        // ── Natural Wonder bookkeeping ───────────────────────────────────────
        if (isNW) {
          const fType = GameplayMap.getFeatureType(x, y);
          const fInfo = GameInfo.Features.lookup(fType);
          const wonderName = Locale.compose(fInfo?.Name) || "Natural Wonder";
          // Use the *improvement's* constructible as the icon, falling back to feature
          const cinfo = GameInfo.Constructibles.lookup(instance.type);
          const ctype = cinfo?.ConstructibleType;
          const iconId = ctype || fInfo?.FeatureType; 
          const wKey = wonderName;

          // Count tiles per wonder
          let wb = wonderBuckets[wKey];
          if (!wb) {
            wb = { key: wKey, name: wonderName, count: 0, iconId };
            wonderBuckets[wKey] = wb;
          }
          wb.count += 1;

          // Per-wonder yields map
          let perWonder = wonderYieldsByName.get(wKey);
          if (!perWonder) {
            perWonder = new Map();
            wonderYieldsByName.set(wKey, perWonder);
          }

          // Sum base tile yields on this wonder
          for (const yInfo of GameInfo.Yields) {
            const yAmount = GameplayMap.getYield(
              x,
              y,
              yInfo.YieldType,
              GameContext.localPlayerID
            );
            if (yAmount > 0) {
              naturalWonderYields.set(
                yInfo.YieldType,
                (naturalWonderYields.get(yInfo.YieldType) || 0) + yAmount
              );
              perWonder.set(
                yInfo.YieldType,
                (perWonder.get(yInfo.YieldType) || 0) + yAmount
              );
            }
          }

          if (happy > 0) {
            nwHappyTiles += 1;
          }
        }

        // ── Tiles with ≥1 Happiness: Resort per-age bonus ───────────────────
        if (happy > 0) {
          qualifyingTileCount += 1;

          // Only show **non-wonder** tiles as normal improvements
          if (!isNW) {
            const cinfo = GameInfo.Constructibles.lookup(instance.type);
            const ctype = cinfo?.ConstructibleType;
            const displayKey =
              ETFI_IMPROVEMENTS.displayNames[ctype] || cinfo?.Name || ctype || "LOC_UNKNOWN";

            let bucket = improvementBuckets[displayKey];
            if (!bucket) {
              bucket = {
                key: displayKey,
                iconId: ctype,
                displayName: Locale.compose(displayKey),
                count: 0,
              };
              improvementBuckets[displayKey] = bucket;
            }
            bucket.count += 1;
          }
        }
      }

      const improvementItems = Object.values(improvementBuckets);
      const wonderItems = Object.values(wonderBuckets);

      if (!qualifyingTileCount && !wonderItems.length) {
        return void 0;
      }

      // ── Era-scaled totals for Happiness & Gold (same logic as original) ──
      const baseNW = nwHappyTiles * multiplier;
      const getNW = (yieldType) => naturalWonderYields.get(yieldType) || 0;

      const totalHappiness =
        qualifyingTileCount * multiplier +
        0.5 * (getNW(ETFI_YIELDS.HAPPINESS) + baseNW);

      const totalGold =
        qualifyingTileCount * multiplier +
        0.5 * (getNW(ETFI_YIELDS.GOLD) + baseNW);

      // ── Extra header yields from natural wonders (Food/Prod/Science/Culture/…) ─
      const extraHeaderYields = [];
      for (const [yieldType, baseAmount] of naturalWonderYields.entries()) {
        if (
          yieldType === ETFI_YIELDS.HAPPINESS ||
          yieldType === ETFI_YIELDS.GOLD
        ) {
          continue; // those are already folded into totalHappiness / totalGold
        }
        const bonus = baseAmount * 0.5; // +50% from Resort effect
        if (bonus > 0) {
          extraHeaderYields.push({ yieldType, bonus });
        }
      }

      // ── HEADER: better spacing between yield blocks ───────────────────────
      let headerYieldsHtml = `
        <div class="flex items-center gap-2 mr-2">
          <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-5"></fxs-icon>
          <span class="font-semibold">+${totalHappiness}</span>
        </div>
        <div class="flex items-center gap-2 mr-2">
          <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-5"></fxs-icon>
          <span class="font-semibold">+${totalGold}</span>
        </div>
      `;

      for (const item of extraHeaderYields) {
        headerYieldsHtml += `
          <div class="flex items-center gap-2 mr-2">
            <fxs-icon data-icon-id="${item.yieldType}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${item.bonus}</span>
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

      // ── Improvements breakdown (non-wonder tiles with ≥1 Happiness) ───────
      if (improvementItems.length) {
        html += `
          <div
            class="mt-1 text-accent-2"
            style="font-size: 0.8em; line-height: 1.4;"
          >
        `;

        for (const item of improvementItems) {
          const perTileBonus = multiplier; // +1/+2/+3 H & G per happy tile
          const happyBonus = item.count * perTileBonus;
          const goldBonus = item.count * perTileBonus;

          html += `
            <div class="flex justify-between items-center mt-1">
              <div class="flex items-center gap-2">
                <fxs-icon data-icon-id="${item.iconId}" class="size-5"></fxs-icon>
                <span class="opacity-60">|</span>
                <span>${item.displayName}</span>
                <span class="opacity-70 ml-1">x${item.count}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="flex items-center gap-2">
                  <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
                  <span class="font-semibold">+${happyBonus}</span>
                </span>
                <span class="flex items-center gap-2">
                  <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
                  <span class="font-semibold">+${goldBonus}</span>
                </span>
              </div>
            </div>
          `;
        }

        html += `</div>`;
      }

      // ── Natural Wonders: icon | name x count + all +50% yields ────────────
      if (wonderItems.length) {
        html += `
          <div class="mt-2" style="font-size: 0.8em; line-height: 1.4;">
        `;

        for (const w of wonderItems) {
          const perMap = wonderYieldsByName.get(w.key);
          if (!perMap) continue;

          let yieldsHtml = "";
          for (const [yType, baseAmount] of perMap.entries()) {
            const bonus = baseAmount * 0.5; // +50% for this wonder
            if (bonus <= 0) continue;

            yieldsHtml += `
              <span class="inline-flex items-center gap-2 mr-1">
                <fxs-icon data-icon-id="${yType}" class="size-4"></fxs-icon>
                <span>+${bonus}</span>
              </span>
            `;
          }

          html += `
            <div class="flex justify-between items-center mt-1">
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
          `;
        }

        html += `</div>`;
      }

      html += `</div>`;
      return html;
    }
    getRequirementsText() {
      const projectType = this.getProjectType() ?? -1;
      const project = GameInfo.Projects.lookup(projectType);
      if (!project) {
        return void 0;
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
      return void 0;
    }
    isBlank() {
      return !this.target;
    }
}
// #endregion

// IMPORTANT: this overrides the existing handler for *only* this tooltip type.
TooltipManager.registerType("production-project-tooltip", new EtfiToolTipType());

export { EtfiToolTipType as default };
