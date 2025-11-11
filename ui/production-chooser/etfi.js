
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
  TOWN_TRADE: "LOC_PROJECT_TOWN_TRADE_NAME"
};
const ETFI_YIELDS = {
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  INFLUENCE: "YIELD_DIPLOMACY",
  HAPPINESS: "YIELD_HAPPINESS"
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

        default:
          return void 0;
      }
    }
    // NEW:
    getImprovementSummaryForSet(city, targetSet, baseMultiplier = 1) {
      if (!city || !city.Constructibles) return null;
      if (!(targetSet instanceof Set) || targetSet.size === 0) return null;
      if (!GameInfo?.Constructibles || !Districts || !Constructibles) return null;
    
      const resultByType = Object.create(null);
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
        const info = GameInfo.Constructibles.lookup(fcID);
        if (!info) continue;
    
        const ctype = info.ConstructibleType;
        if (!targetSet.has(ctype)) continue;
    
        if (!resultByType[ctype]) {
          const nameKey = ETFI_IMPROVEMENTS.displayNames[ctype] || info.Name || ctype;
          resultByType[ctype] = {
            type: ctype,
            displayName: Locale.compose(nameKey),
            count: 0,
          };
        }
    
        resultByType[ctype].count += 1;
      }
    
      const items = Object.values(resultByType);
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
          <div class="flex items-center gap-2 text-accent-2 mb-1">
            <fxs-icon data-icon-id="${yieldIconId}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${total}</span>
          </div>
      `;
    
      // Breakdown per improvement type
      html += `<div class="mt-1 text-xs text-accent-2">`;
      for (const item of items) {
        html += `
          <div class="flex justify-between">
            <span>${item.displayName}</span>
            <span>+${item.count}</span>
          </div>
        `;
      }
      html += `</div>`;
    
      html += `
        <div class="flex justify-between mt-1 pt-1 border-t border-white/10 text-xs text-accent-2">
          <span>${Locale.compose("LOC_MOD_ETFI_ERA_BONUS")}</span>
          <span>x${multiplier}</span>
        </div>
      `;
    
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
          <div class="flex items-center gap-2 text-accent-2 mb-1">
            <fxs-icon data-icon-id="${ETFI_YIELDS.INFLUENCE}" class="size-5"></fxs-icon>
            <span class="font-semibold">+${totalConnections}</span>
          </div>

          <div class="mt-1 text-xs text-accent-2">
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
