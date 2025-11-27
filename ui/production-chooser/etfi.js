
/**
 * Enhanced Town Focus Info Mod - Makes Town Focus Tooltips more informative
 * Author: Zatygold
 * Version: 2.0.2
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.chunk.js';
import { c as GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';
import FoodFocusDetails from '../etfi-town-focus/farm-fish-towns.js';
import MiningDetails from '../etfi-town-focus/mining-town.js';
import HubDetails from '../etfi-town-focus/hub-town.js';
import ResortDetails from '../etfi-town-focus/resort-town.js';
import TradeDetails from '../etfi-town-focus/trade-town.js';
import TempleDetails from '../etfi-town-focus/temple-town.js';
import UrbanCenterDetails from '../etfi-town-focus/urban-town.js';
import FortTownDetails from '../etfi-town-focus/fort-town.js';
import { ETFI_YIELDS } from '../../etfi-utilities.js';

// #region Localization constants
const ETFI_PROJECT_TYPES = {
  TOWN_FARMING:"LOC_PROJECT_TOWN_GRANARY_NAME",
  TOWN_FISHING: "LOC_PROJECT_TOWN_FISHING_NAME",
  TOWN_MINING: "LOC_PROJECT_TOWN_PRODUCTION_NAME",
  TOWN_HUB: "LOC_PROJECT_TOWN_INN_NAME",
  TOWN_TRADE: "LOC_PROJECT_TOWN_TRADE_NAME",
  TOWN_RESORT: "LOC_PROJECT_TOWN_RESORT_NAME",
  TOWN_TEMPLE:"LOC_PROJECT_TOWN_TEMPLE_NAME",
  TOWN_URBAN: "LOC_PROJECT_TOWN_URBAN_CENTER_NAME",
  TOWN_FORT: "LOC_PROJECT_TOWN_FORT_NAME"
};

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
        this.detailsContainer, // NEW: ETFI Container
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
    getDetailsText(city) {  // NEW: central dispatcher for ETFI details text, with fallback to empty header if no details available
      if (!this.target) return null;

      const projectNameKey = this.target.dataset.name; // e.g. "LOC_PROJECT_TOWN_GRANARY_NAME"
      if (!projectNameKey) return null;

      switch (projectNameKey) {
        case ETFI_PROJECT_TYPES.TOWN_FARMING:
        case ETFI_PROJECT_TYPES.TOWN_FISHING: {
          const html = new FoodFocusDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }

        case ETFI_PROJECT_TYPES.TOWN_MINING: {
          const html = new MiningDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }
        
        case ETFI_PROJECT_TYPES.TOWN_HUB: {
          const html = new HubDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }
        
        case ETFI_PROJECT_TYPES.TOWN_TRADE: {
          const html = new TradeDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }

        case ETFI_PROJECT_TYPES.TOWN_RESORT: {
          const html = new ResortDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }

        case ETFI_PROJECT_TYPES.TOWN_TEMPLE: {
          const html = new TempleDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }
        
        case ETFI_PROJECT_TYPES.TOWN_URBAN: {
          const html = new UrbanCenterDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }

        case ETFI_PROJECT_TYPES.TOWN_FORT: {
          const html = new FortTownDetails().render(city);
          return html || this.onRenderEmptyDetailsHTML(projectNameKey);
        }

        default:
          return null;
      }
    }
    onRenderEmptyDetailsHTML(projectNameKey) { // NEW: render fallback empty header with +0 yields based on project type
      const map = {};
      map[ETFI_PROJECT_TYPES.TOWN_FARMING]  = [ETFI_YIELDS.FOOD];
      map[ETFI_PROJECT_TYPES.TOWN_FISHING]  = [ETFI_YIELDS.FOOD];
      map[ETFI_PROJECT_TYPES.TOWN_MINING]   = [ETFI_YIELDS.PRODUCTION];
      map[ETFI_PROJECT_TYPES.TOWN_HUB]      = [ETFI_YIELDS.INFLUENCE];
      map[ETFI_PROJECT_TYPES.TOWN_TRADE]    = [ETFI_YIELDS.HAPPINESS];
      map[ETFI_PROJECT_TYPES.TOWN_RESORT]   = [ETFI_YIELDS.HAPPINESS, ETFI_YIELDS.GOLD];
      map[ETFI_PROJECT_TYPES.TOWN_TEMPLE]   = [ETFI_YIELDS.HAPPINESS];
      map[ETFI_PROJECT_TYPES.TOWN_URBAN]    = [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS];

      const yields = map[projectNameKey] || [];

      // Build standardized header chips with +0 values
      let headerYieldsHtml = "";
      if (yields.length) {
        for (const yType of yields) {
          headerYieldsHtml += `
            <div class="flex items-center gap-2 mr-2">
              <fxs-icon data-icon-id="${yType}" class="size-5"></fxs-icon>
              <span class="font-semibold">+0</span>
            </div>
          `;
        }
      } else {
        // Sensible fallback if we can't infer the relevant yields
        headerYieldsHtml = `
          <div class="flex items-center gap-2 mr-2">
            <span class="font-semibold">+0</span>
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
