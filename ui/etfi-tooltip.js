/**
 * Enhanced Town Focus Info Mod - Makes Town Focus Tooltips more informative
 * Authors: Zatygold & Mallek
 * Version: 1.2.3
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
const DEV_MODE = false; // Set to false for production, true for debugging
const ETFI_USE_LEGACY_OBSERVER = false;

(function () {
  // ---------- Config & constants ----------
  const VERSION = "1.2.3";
  const HIGH_RES_SCALING = 1.75;
  const FONT_SIZES = {LARGE: 18, MEDIUM: 16, SMALL: 14};
  let cityID;

  // Localization constants
  const L10N = {
    ERA_BONUS: Locale.compose("LOC_MOD_ETFI_ERA_BONUS"),
    TOTAL_RESOURCES: Locale.compose("LOC_MOD_ETFI_TOTAL_RESOURCES"),
    HAPPINESS_PER_RESOURCE: Locale.compose(
      "LOC_MOD_ETFI_HAPPINESS_PER_RESOURCE"
    ),
    SPECIAL_QUARTERS: Locale.compose("LOC_MOD_ETFI_SPECIAL_QUARTERS"),
    UNIQUE_QUARTERS: Locale.compose("LOC_MOD_ETFI_UNIQUE_QUARTERS"),
    FULL_TILE_QUARTERS: Locale.compose("LOC_MOD_ETFI_FULL_TILE_QUARTERS"),
    BUILDING_QUARTERS: Locale.compose("LOC_MOD_ETFI_BUILDING_QUARTERS"),
    IMPROVEMENTS: {
      WOODCUTTER: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
      MINE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
      FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
      FARM: "LOC_MOD_ETFI_IMPROVEMENT_FARM",
      PASTURE: "LOC_MOD_ETFI_IMPROVEMENT_PASTURE",
      PLANTATION: "LOC_MOD_ETFI_IMPROVEMENT_PLANTATION",
      CAMP: "LOC_MOD_ETFI_IMPROVEMENT_CAMP",
      CLAY_PIT: "LOC_MOD_ETFI_IMPROVEMENT_CLAY_PIT",
      QUARRY: "LOC_MOD_ETFI_IMPROVEMENT_QUARRY",
    },
  };

  const IMPROVEMENTS = {
    displayNames: {
      IMPROVEMENT_WOODCUTTER: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
      IMPROVEMENT_WOODCUTTER_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
      IMPROVEMENT_MINE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
      IMPROVEMENT_MINE_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
      IMPROVEMENT_FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
      IMPROVEMENT_FISHING_BOAT_RESOURCE:
        "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
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

  const TOOLTIPS = {
    ids: new Set([
      "LOC_PROJECT_TOWN_URBAN_CENTER_NAME",
      "LOC_PROJECT_TOWN_GRANARY_NAME",
      "LOC_PROJECT_TOWN_FISHING_NAME",
      "LOC_PROJECT_TOWN_PRODUCTION_NAME",
      "LOC_PROJECT_TOWN_INN_NAME",
      "LOC_PROJECT_TOWN_TRADE_NAME",
      "LOC_PROJECT_TOWN_RESORT_NAME",
      "LOC_PROJECT_TOWN_TEMPLE_NAME",
    ]),
    configs: {
      LOC_PROJECT_TOWN_URBAN_CENTER_NAME: {
        counter: handleUrbanTown,
        icons: ["YIELD_GOLD", "YIELD_HAPPINESS"],
      },
      LOC_PROJECT_TOWN_GRANARY_NAME: {
        counter: () => getImprovementCount(Array.from(IMPROVEMENTS.sets.food)),
        icons: ["YIELD_FOOD"],
      },
      LOC_PROJECT_TOWN_FISHING_NAME: {
        counter: () => getImprovementCount(Array.from(IMPROVEMENTS.sets.food)),
        icons: ["YIELD_FOOD"],
      },
      LOC_PROJECT_TOWN_PRODUCTION_NAME: {
        counter: () =>
          getImprovementCount(Array.from(IMPROVEMENTS.sets.production)),
        icons: ["YIELD_PRODUCTION"],
      },
      LOC_PROJECT_TOWN_INN_NAME: {
        counter: getTradeCount,
        icons: ["YIELD_DIPLOMACY"],
      },
      LOC_PROJECT_TOWN_TRADE_NAME: {
        counter: getResourceCount,
        icons: ["YIELD_HAPPINESS"],
      },
      LOC_PROJECT_TOWN_RESORT_NAME: {
        counter: getRuralTileCount,
        icons: ["YIELD_HAPPINESS", "YIELD_GOLD"],
      },
      LOC_PROJECT_TOWN_TEMPLE_NAME: {
        counter: handleTempleTown,
        icons: ["YIELD_HAPPINESS"],
      },
    },
  };
  const HAPPINESS_YIELD =
    (YieldTypes && YieldTypes.YIELD_HAPPINESS) || "YIELD_HAPPINESS";
  const SPECIAL_BUILDINGS = new Set(["BUILDING_RAIL_STATION"]);

  // ---------- State ----------
  const state = {
    tooltipObserver: null,
    contentObserver: null,
    lastTooltip: null,
    resourceCache: new Map(),
    ruralTileCache: new Map(),
    lastCityID: null,
  };

  // ---------- Utilities ----------
  function log(...args) {
    if (!DEV_MODE) return;
    try {
      console.error(
        `[ETFI v${VERSION}] ${args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")}`
      );
    } catch (e) {}
  }

  function getScaledFontSize(baseSize) {
    const scale =
      window.devicePixelRatio > 1 || window.innerWidth > 2560
        ? HIGH_RES_SCALING
        : 1;
    return `${baseSize * scale}px`;
  }

  // Cache DOM templates
  const iconTemplate = Object.assign(document.createElement("div"), {
    className: "flex items-center",
  });

  const infoTemplate = Object.assign(document.createElement("div"), {
    className: "additional-info",
    style: `
            background: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 8px;
            border-radius: 5px;
            margin-top: 5px;
            text-align: left;
            font-size: ${getScaledFontSize(FONT_SIZES.LARGE)};
            max-width: 100%;
            display: block;
        `,
  });

  /**
   * Urban Center:
   * +100% Gold and Happiness towards Building Maintenance in this Town.
   * Can Purchase additional Buildings in this Town.
   * @param {} cityID
   * @returns
   */
  function handleUrbanTown() {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    const buildings = (getCityBuildings(city) || []).filter(
      (b) =>
        b.Completed &&
        b.maintenanceMap instanceof Map &&
        b.maintenanceMap.size > 0
    );

    const breakdown = buildings.map((b) => {
      const name = Locale.compose(b.Name);
      let inline = "";

      let totalMaint = 0;
      const perYield = [];

      b.maintenanceMap.forEach(({icon, value}) => {
        const v = Number(value) || 0;
        totalMaint += v;
        inline += `
        <span style="display:inline-flex;align-items:center;gap:6px;margin-left:10px;">
          <fxs-icon data-icon-id="${icon}" class="size-5"></fxs-icon>
          <span>${value}</span>
        </span>`;
      });

      return {
        label: `${name}${inline}`,
        count: "+100%",
      };
    });

    return {
      total: buildings.length,
      details: {
        label: Locale.compose?.("Building Maintenance"),
        breakdown,
      },
    };
  }
  /**
   * Religious Site:
   * +1 Happiness on all buildings and +1 Relic slot on Temples in this town
   * @param {*} cityID
   * @returns
   */
  function handleTempleTown() {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    const buildings = getCityBuildings(city) || [];
    const quarters = [];
    const byTile = new Map();

    for (const b of buildings) {
      const loc = b.Location;
      const key =
        loc && loc.x != null && loc.y != null ? `${loc.x},${loc.y}` : "NO_TILE";
      if (!byTile.has(key)) byTile.set(key, []);
      byTile.get(key).push(b.Name);
    }

    for (const [, nameKeys] of byTile) {
      // skip empty
      if (!nameKeys.length) continue;
      quarters.push({
        isSpecial: false,
        isUnique: false,
        isFullTile: false,
        buildings: nameKeys, // name keys; renderer will Locale.compose and join with " + "
        contribution: nameKeys.length,
      });
    }

    return {
      total: buildings.length,
      details: {
        multiplier: 1,
        quarters,
      },
    };
  }

  /**
   * Resort Towns:
   * +1/+2/+3 Happiness and Gold per Age on Rural tiles in this Town that have at least 1 Happiness.
   * +50% tile yields from Natural Wonders
   * @param {*} cityID
   * @returns
   */
  function getRuralTileCount() {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    const cacheKey = `${city.id.owner}-${city.id.id}`;
    if (state.ruralTileCache.has(cacheKey)) {
      return state.ruralTileCache.get(cacheKey);
    }

    const multiplier = getEraMultiplier();
    const countsByImprovement = Object.create(null);

    const naturalWonderYields = new Map();
    const wonderYieldsByName = new Map();
    let qualifyingTileCount = 0;
    let nwHappyTiles = 0;

    const resort = TOOLTIPS.configs["LOC_PROJECT_TOWN_RESORT_NAME"];
    const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];

    for (const instanceId of improvements) {
      const instance = Constructibles.get(instanceId);
      const location = instance?.location;
      if (location?.x == null || location?.y == null) continue;

      // Resort base rule: tiles with ≥1 Happiness
      const happy = GameplayMap.getYield(
        location.x,
        location.y,
        HAPPINESS_YIELD,
        GameContext.localPlayerID
      );

      // Natural wonder: sum all yields and count wonder tiles by name
      if (GameplayMap.isNaturalWonder(location.x, location.y)) {
        const wtype = GameplayMap.getFeatureType(location.x, location.y);
        const winfo = GameInfo.Features.lookup(wtype);
        const name = Locale.compose(winfo?.Name);
        const wKey = `★ ${name}`;

        // Per-wonder yield bucket
        let perWonder = wonderYieldsByName.get(wKey);
        if (!perWonder) {
          perWonder = new Map();
          wonderYieldsByName.set(wKey, perWonder);
        }

        for (const yieldInfo of GameInfo.Yields) {
          const yieldAmount = GameplayMap.getYield(
            location.x,
            location.y,
            yieldInfo.YieldType,
            GameContext.localPlayerID
          );
          if (yieldAmount > 0) {
            if (
              Array.isArray(resort.icons) &&
              !resort.icons.includes(yieldInfo.YieldType)
            ) {
              resort.icons.push(yieldInfo.YieldType);
            }

            const prev =
              naturalWonderYields.get(yieldInfo.YieldType)?.count || 0;
            naturalWonderYields.set(yieldInfo.YieldType, {
              count: prev + yieldAmount,
            });
            perWonder.set(
              yieldInfo.YieldType,
              (perWonder.get(yieldInfo.YieldType) || 0) + yieldAmount
            );
          }
        }
        wonderYieldsByName.set(wKey, perWonder);
        countsByImprovement[wKey] = (countsByImprovement[wKey] || 0) + 1;
        if (happy > 0) nwHappyTiles += 1;
      }

      if (happy > 0) {
        const cinfo = GameInfo.Constructibles?.lookup(instance.type);
        const ctype = cinfo?.ConstructibleType;
        const name = Locale.compose(
          IMPROVEMENTS.displayNames[ctype] || cinfo.Name || ctype
        );
        countsByImprovement[name] = (countsByImprovement[name] || 0) + 1;
        qualifyingTileCount += 1;
      }
    }
    /**
     * Future Update, more details per item. What each improvement provides in yields, indivdually.
     */
    // const orderYields = [
    //     "YIELD_FOOD", "YIELD_PRODUCTION", "YIELD_GOLD", "YIELD_SCIENCE",
    //     "YIELD_CULTURE", "YIELD_FAITH", "YIELD_HAPPINESS"
    // ];

    // function iconChunk(yType, amt) {
    //     return `<span style="display:inline-flex;align-items:center;gap:2px;margin-right:6px;">
    //     <fxs-icon data-icon-id="${yType}" class="size-5"></fxs-icon><span>+${amt/2}</span></span>`;
    // }

    // for (const [wKey, perMap] of wonderYieldsByName) {
    //     const pieces = [];
    //     for (const yType of orderYields) {
    //         const val = (perMap && perMap.get && perMap.get(yType)) || 0;
    //         if (val > 0) pieces.push(iconChunk(yType, val));
    //     }
    //     const base = wKey.replace(/\s*:\s*$/, ""); // trim the trailing colon we added
    //     const pretty = pieces.length ? `${base} <span style="margin-left:8px;">${pieces.join("")}</span>`: base;
    //     if (countsByImprovement[wKey] != null) {
    //         countsByImprovement[pretty] = countsByImprovement[wKey];
    //         delete countsByImprovement[wKey];
    //     }
    // }

    const baseNW = nwHappyTiles * multiplier;
    const getNW = (y) => naturalWonderYields.get(y)?.count || 0;

    const result = {
      totalHappiness:
        qualifyingTileCount * multiplier +
        0.5 * (getNW("YIELD_HAPPINESS") + baseNW),
      totalGold:
        qualifyingTileCount * multiplier + 0.5 * (getNW("YIELD_GOLD") + baseNW), // applies to both Happiness and Gold icons
      totals: naturalWonderYields,
      multiplier,
      details: countsByImprovement,
    };

    state.ruralTileCache.set(cacheKey, result);
    return result;
  }

  /**
   * Trade Outpost:
   * +2 Happiness to each resource tile in the town
   * and +5 Trade Route range
   * @param {*} cityID
   * @returns
   */
  function getResourceCount(cityID) {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    // Check if we have cached data for this city
    const cacheKey = `${city.id.owner}-${city.id.id}`;
    if (state.resourceCache.has(cacheKey)) {
      return state.resourceCache.get(cacheKey);
    }

    const resources = new Map(); // Map to store resource counts by type

    // Get city location and purchased plots
    const cityLocation = city.location;
    const purchasedPlotIndices = city.getPurchasedPlots?.() || [];

    if (!cityLocation) return {total: 0, details: {}};

    // Start with the city center plot
    const plots = [cityLocation];

    // Convert purchased plot indices to coordinates and add them
    if (purchasedPlotIndices.length) {
      for (const plotIndex of purchasedPlotIndices) {
        const plotCoords = GameplayMap.getLocationFromIndex(plotIndex);
        if (plotCoords) {
          plots.push(plotCoords);
        }
      }
    }

    // Check each plot for resources
    for (const plot of plots) {
      if (plot?.x == null || plot?.y == null) continue;

      const resourceType = GameplayMap.getResourceType(plot.x, plot.y);
      const NO_RESOURCE = (typeof ResourceTypes !== "undefined" && ResourceTypes.NO_RESOURCE) || 0;
      if (resourceType === NO_RESOURCE) continue;

      const resourceInfo = GameInfo.Resources.lookup(resourceType);
      if (!resourceInfo) continue;

      const resourceName = Locale.compose(resourceInfo.Name);
      const iconId = resourceInfo.ResourceType; // Get the resource type as icon ID
      resources.set(resourceName, {
        count: (resources.get(resourceName)?.count || 0) + 1,
        iconId,
      });
    }

    const total = Array.from(resources.values()).reduce(
      (sum, data) => sum + data.count,
      0
    );
    const happiness = total * 2; // Each resource provides +2 happiness

    const result = {
      total: happiness,
      details: {
        resources: Array.from(resources.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          iconId: data.iconId,
        })),
        resourceCount: total,
      },
    };

    // Cache the result
    state.resourceCache.set(cacheKey, result);

    return result;
  }

  /**
   * Farming Town: +1/+2/+3 Food on Farms, Pastures, Plantations and Fishing Boats.
   * Fishing Town: +1/+2/+3 Food on Farms, Pastures, Plantations and Fishing Boats.
   * Mining Town: +2/+3/+4 Production on Camps, Woodcutters, Clay Pits, Mines, and Quarries.
   * @param {*} cityID
   * @param {*} targetImprovements
   * @returns
   */
  function getImprovementCount(targetImprovements) {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    // --- classify which bucket the caller passed in (food vs production) ---
    const arr = Array.isArray(targetImprovements) ? targetImprovements : [];
    let isFood = true,
      isProduction = true;
    for (const target of arr) {
      if (!IMPROVEMENTS.sets.food.has(target)) isFood = false;
      if (!IMPROVEMENTS.sets.production.has(target)) isProduction = false;
    }
    const kind = isProduction ? "production" : isFood ? "food" : "generic";

    let detailedCounts = {};
    const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT");
    const targetSet = new Set(targetImprovements);

    for (const instanceId of improvements) {
      const instance = Constructibles.get(instanceId);
      if (!instance) continue;

      const location = instance?.location;
      if (location?.x == null || location?.y == null) continue;
      //Using free constructible to get the warehouse bonus.
      //This ensures it counts those tiles when calculating
      const fcID = Districts.getFreeConstructible(
        location,
        GameContext.localPlayerID
      );

      const info = GameInfo.Constructibles.lookup(fcID);
      if (info && targetSet.has(info.ConstructibleType)) {
        const displayName = Locale.compose(
          IMPROVEMENTS.displayNames[info.ConstructibleType] ||
            info.ConstructibleType
        );
        detailedCounts[displayName] = (detailedCounts[displayName] || 0) + 1;
      }
    }

    let total = Object.values(detailedCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    // Multiply based on era
    const ageData = GameInfo.Ages.lookup(Game.age);
    let multiplier = 0;
    if (kind === "production") {
      multiplier = 2;
    } else {
      multiplier = 1;
    }

    if (ageData) {
      const currentAge = ageData.AgeType?.trim();
      if (currentAge === "AGE_EXPLORATION") {
        multiplier += 1;
      } else if (currentAge === "AGE_MODERN") {
        multiplier += 2;
      }
    }

    return {
      total: total * multiplier,
      details: detailedCounts,
      multiplier,
    };
  }

  /**
   * Urban Center:
   * +100% Gold and Happiness towards Building Maintenance in this Town.
   * Can Purchase additional Buildings in this Town.
   * @param {} cityID
   * @returns
   */
  function getBuildingCount(cityID) {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    const iCurrentAge = Game.age;
    const quarters = []; // Store all quarters

    // Apply era-based multiplier (same as other town focus types)
    const ageData = GameInfo.Ages.lookup(Game.age);
    let multiplier = 1;
    if (ageData) {
      const currentAge = ageData.AgeType?.trim();
      if (currentAge === "AGE_EXPLORATION") {
        multiplier = 2;
      } else if (currentAge === "AGE_MODERN") {
        multiplier = 3;
      }
    }

    // Collect all buildings
    const buildings = [];
    const buildingsByTile = new Map(); // Map of tile coordinates to array of buildings

    for (const instanceId of city.Constructibles.getIdsOfClass("BUILDING")) {
      const instance = Constructibles.get(instanceId);
      if (!instance?.location) continue;

      const buildingInfo = GameInfo.Constructibles.lookup(instance.type);
      if (!buildingInfo) continue;

      // Special buildings are always quarters
      if (SPECIAL_BUILDINGS.has(buildingInfo.ConstructibleType)) {
        quarters.push({
          isSpecial: true,
          buildings: [buildingInfo.Name],
          contribution: 1,
        });
        continue;
      }

      // Get the key for this location
      const key = `${instance.location.x},${instance.location.y}`;

      // Store building in location map
      if (!buildingsByTile.has(key)) {
        buildingsByTile.set(key, []);
      }

      // Create a building object with important properties
      const building = {
        Info: buildingInfo,
        Name: buildingInfo.Name,
        Ageless: GameInfo.TypeTags.find(
          (e) => e.Tag == "AGELESS" && e.Type == buildingInfo.ConstructibleType
        ),
        UniqueTrait: GameInfo.Buildings.find(
          (e) =>
            e.ConstructibleType == buildingInfo.ConstructibleType &&
            e.TraitType !== null
        ),
        ConstructibleAge: Database.makeHash(buildingInfo?.Age ?? ""),
        Completed: instance.complete,
        FullTile: GameInfo.TypeTags.find(
          (e) =>
            e.Tag == "FULL_TILE" && e.Type == buildingInfo.ConstructibleType
        ),
      };

      // Only include completed buildings
      if (building.Completed) {
        buildings.push(building);
        buildingsByTile.get(key).push(building);
      }
    }

    log("Buildings found:", buildings.length);

    // Check each tile for quarters - examining stacked buildings
    buildingsByTile.forEach((tileBuildingStack, tileKey) => {
      // Skip if we don't have enough buildings
      if (tileBuildingStack.length < 1) return;

      // TCS Quarter detection logic
      const uniques = [];
      const ages = [];

      // Collect traits and ages
      tileBuildingStack.forEach((building) => {
        if (building.UniqueTrait) {
          uniques.push(building.UniqueTrait.TraitType);
        }

        if (building.ConstructibleAge || building.Ageless) {
          if (building.Ageless) {
            ages.push(iCurrentAge);
          } else {
            ages.push(building.ConstructibleAge);
          }
        }
      });

      // Check for unique civilization quarter
      if (uniques.length > 1) {
        const uniquesSet = new Set(uniques);
        if (uniquesSet.size == 1) {
          log(
            "Found unique quarter from civilization trait:",
            Array.from(uniquesSet)[0]
          );
          const uniqueQuarter = GameInfo.UniqueQuarters.find(
            (e) => e.TraitType == uniques[0]
          );
          if (uniqueQuarter) {
            const civType = GameInfo.LegacyCivilizationTraits.find(
              (e) => e.TraitType == uniques[0]
            );
            if (civType) {
              const civLegacy = GameInfo.LegacyCivilizations.find(
                (e) => e.CivilizationType == civType.CivilizationType
              );
              if (civLegacy) {
                quarters.push({
                  isSpecial: true,
                  isUnique: true,
                  buildings: tileBuildingStack.map((b) => b.Name),
                  civName: civLegacy.Adjective,
                  quarterName: uniqueQuarter.Name,
                  contribution: 1,
                });
              }
            }
          }
        }
      }
      // Check for current-age quarter (2+ buildings)
      else if (ages.length > 1) {
        const agesSet = new Set(ages);
        if (agesSet.size == 1 && ages[0] == iCurrentAge) {
          log(
            "Found standard quarter with multiple buildings from current age"
          );
          quarters.push({
            isSpecial: false,
            buildings: tileBuildingStack.map((b) => b.Name),
            contribution: 1,
          });
        }
      }
      // Check for full-tile building quarter
      else if (tileBuildingStack.length == 1 && tileBuildingStack[0].FullTile) {
        const building = tileBuildingStack[0];
        // Only count as a quarter if it's from the current age or ageless
        if (building.Ageless || building.ConstructibleAge == iCurrentAge) {
          log(
            "Found full-tile building quarter:",
            Locale.compose(building.Name)
          );
          quarters.push({
            isSpecial: false,
            isFullTile: true,
            buildings: [building.Name],
            contribution: 1,
          });
        }
      }
      // Default stack detection (2+ buildings)
      else if (tileBuildingStack.length >= 2) {
        log(
          "Found default building stack with",
          tileBuildingStack.length,
          "buildings"
        );
        quarters.push({
          isSpecial: false,
          buildings: tileBuildingStack.map((b) => b.Name),
          contribution: 1,
        });
      }
    });

    // Calculate final bonus - just quarters times multiplier
    const quartersCount = quarters.length;
    const totalBonus = quartersCount * multiplier;

    log("Quarters found:", quartersCount);
    log("Era multiplier:", multiplier);
    log("Total calculated bonus:", totalBonus);

    return {
      total: totalBonus,
      details: {
        quarterCount: quartersCount,
        multiplier: multiplier,
        quarters: quarters.sort((a, b) => {
          // Sort order: Unique quarters > Special quarters > Full-tile > Regular stacks
          if (a.isUnique && !b.isUnique) return -1;
          if (!a.isUnique && b.isUnique) return 1;
          if (a.isSpecial && !b.isSpecial) return -1;
          if (!a.isSpecial && b.isSpecial) return 1;
          if (a.isFullTile && !b.isFullTile) return -1;
          if (!a.isFullTile && b.isFullTile) return 1;
          return 0;
        }),
      },
    };
  }

  /**
   * Hub Town:
   * +1 Influence per Settlement Connected to this Town.
   * @param {} cityID
   * @returns
   */
  function getTradeCount(cityID) {
    const city = resolveCity(cityID);
    if (!city) return {total: 0, details: {}};

    // Get all connected settlements
    const connectedIds = city.getConnectedCities();
    if (!connectedIds?.length) {
      return {total: 0, details: {}};
    }

    // Group settlements by type with their names
    const towns = [];
    const cities = [];

    connectedIds.forEach((id) => {
      const settlement = Cities.get(id);
      if (!settlement) return;

      const name = Locale.compose(settlement.name);
      if (settlement.isTown) {
        towns.push(name);
      } else {
        cities.push(name);
      }
    });

    // Each connection provides +1 to the Hub Town bonus
    return {
      total: towns.length + cities.length,
      details: {
        label: Locale.compose("LOC_MOD_ETFI_TRADE_CONNECTIONS"),
        breakdown: [
          {
            label: Locale.compose("LOC_MOD_ETFI_CONNECTED_CITIES"),
            count: cities.length,
            names: cities,
          },
          {
            label: Locale.compose("LOC_MOD_ETFI_CONNECTED_TOWNS"),
            count: towns.length,
            names: towns,
          },
        ],
      },
    };
  }

  // ---------- Helpers ----------
  /**
   * Helper function for City validation / Null check
   * @param {*} cityID
   * @returns city or null
   */
  function resolveCity(cityID) {
    if (!cityID) return null;
    const city = cityID?.Constructibles ? cityID : Cities.get(cityID);
    return city?.Constructibles ? city : null;
  }

  /**
   * Helper function for getting city buildings and details
   * @param {*} city
   * @returns constructibleData (list of buildings owned by the city/town)
   */
  function getCityBuildings(city) {
    if (!city?.Constructibles) return [];
    const constructibles = city.Constructibles;
    const constructibleData = [];
    const ids = constructibles.getIdsOfClass("BUILDING") || [];

    for (const index of ids) {
      const instance = Constructibles.get(index);
      if (!instance.location) continue;

      const info = GameInfo.Constructibles.lookup(instance.type);
      if (!info) continue;

      // Create a building object with important properties
      constructibleData.push({
        Info: info,
        Name: info.Name,
        Type: info.ConstructibleType,
        Completed: !!instance.complete,
        Location: instance.location ?? null,
        Ageless: GameInfo.TypeTags.find?.(
          (e) => e.Tag == "AGELESS" && e.Type == info.ConstructibleType
        ),
        FullTitle: GameInfo.TypeTags.find?.(
          (e) => e.Tag == "FULL_TILE" && e.Type == info.ConstructibleType
        ),
        UniqueTrait: GameInfo.Buildings.find?.(
          (e) =>
            e.ConstructibleType == info.ConstructibleType &&
            e.TraitType !== null
        ),
        ConstructibleAge: Database.makeHash(info?.Age ?? ""),
      });

      const maintenances = constructibles.getMaintenance(instance.type) || {};
      const last = constructibleData[constructibleData.length - 1];

      for (const index in maintenances) {
        const mValue = maintenances[index];
        if (mValue > 0) {
          last.maintenanceMap ??= new Map();
          // if (!constructibleData.maintenanceMap) {
          //   constructibleData.maintenanceMap = new Map();
          // }
          const yields = GameInfo.Yields[index];
          const yieldData = {
            name: yields.Name,
            value: -mValue,
            icon: yields.YieldType,
          };
          last.maintenanceMap.set(yields.YieldType, yieldData);
          //constructibleData.maintenanceMap.set(yields.YieldType, yieldData);
        }
      }
    }
    return constructibleData;
  }

  /**
   * Helper function for getting the era/age number. Which may be used as a multiplier
   * @returns 1, 2, or 3
   */
  function getEraMultiplier() {
    const ageData = GameInfo?.Ages?.lookup?.(Game.age);
    if (!ageData) return 1;
    const t = (ageData.AgeType || "").trim();
    if (t === "AGE_EXPLORATION") return 2;
    if (t === "AGE_MODERN") return 3;
    return 1;
  }

  function clearResourceCache() {
    state.resourceCache.clear();
    state.lastCityID = null;
  }

  function clearRuralTileCache() {
    state.ruralTileCache.clear();
    state.lastCityID = null;

    const resort = TOOLTIPS?.configs?.["LOC_PROJECT_TOWN_RESORT_NAME"];
    if (!resort || !Array.isArray(resort.icons)) return;

    resort.icons.splice(
      0,
      resort.icons.length,
      "YIELD_HAPPINESS",
      "YIELD_GOLD"
    );
  }

  /**
   * Clear per-city building cache (call when city selection/ownership changes or tooltip closes)
   * */
  function clearBuildingCache() {
    state.buildingCache?.clear?.();
  }

  // ---------- Tooltip ----------
  let ETFI_IS_UPDATING = false;
  
  function clearTooltipContent(tooltip) {
    if (!tooltip) return;
    const content = tooltip.querySelector(".tooltip__content");
    if (!content) return;
    content.querySelectorAll(".additional-info").forEach((el) => el.remove());
  }

  function observeTooltipContent(tooltip) {
    if (state.contentObserver) state.contentObserver.disconnect();
    const content = tooltip.querySelector(".tooltip__content");
    if (!content) return;

    state.contentObserver = new MutationObserver(() => {
      // Force immediate recalculation when content changes
      if (ETFI_IS_UPDATING) return;
      requestAnimationFrame(() => modifyTooltip(tooltip));
    });

    state.contentObserver.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
  }

  function modifyTooltip(tooltip) {
    log("Modifying tooltip:", tooltip);
    clearTooltipContent(state.lastTooltip);
    state.lastTooltip = tooltip;

    cityID = getCityID();
    if (!cityID) {
      log("No city ID found");
      return;
    }
    log("Found city ID:", cityID);

    const l10nId = tooltip
      .querySelector("[data-l10n-id]")
      ?.getAttribute("data-l10n-id");
    log("Tooltip ID:", l10nId);

    if (!TOOLTIPS.ids.has(l10nId)) {
      log("Tooltip ID not in tracked set:", l10nId);
      clearTooltipContent(tooltip);
      return;
    }

    const config = TOOLTIPS.configs[l10nId];
    log("Found config for tooltip:", l10nId);

    const content = tooltip.querySelector(".tooltip__content");
    if (!content) return;
    log("Found tooltip content");

    const totalCount = config.counter(cityID);
    log("Counter result:", totalCount);

    const newInfo = infoTemplate.cloneNode(true);
    newInfo.style.display = "flex";
    newInfo.style.flexDirection = "column";
    newInfo.style.gap = "8px";
    newInfo.style.padding = "8px";

    // Development version display
    if (DEV_MODE) {
      const versionDiv = document.createElement("div");
      versionDiv.style.cssText = `
                color: #888;
                font-size: ${getScaledFontSize(FONT_SIZES.SMALL)};
                text-align: right;
                margin-bottom: 4px;
            `;
      versionDiv.textContent = `v${VERSION}`;
      newInfo.appendChild(versionDiv);
    }

    // Style the total section
    const totalDiv = document.createElement("div");
    totalDiv.style.cssText = `
            display: flex;
            gap: 8px;
            padding-bottom: 12px;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: ${getScaledFontSize(FONT_SIZES.LARGE)};
        `;
    if (l10nId === "LOC_PROJECT_TOWN_RESORT_NAME") {
      // Special handling for Resort focus to show happiness calculation
      config.icons.forEach((iconId) => {
        const iconDiv = iconTemplate.cloneNode(true);
        let amount;

        if (iconId === "YIELD_HAPPINESS") {
          amount = totalCount.totalHappiness;
        } else if (iconId === "YIELD_GOLD") {
          amount = totalCount.totalGold;
        } else {
          amount = totalCount.totals?.get(iconId)?.count ?? 0;
          amount *= 0.5;
        }

        iconDiv.innerHTML = `
                    <fxs-icon data-icon-id="${iconId}" class="size-6 mr-1"></fxs-icon>
                    <strong>+${amount}</strong>
                `;
        totalDiv.appendChild(iconDiv);
      });
    } else if (l10nId === "LOC_PROJECT_TOWN_TRADE_NAME") {
      // Special handling for Trade focus to show happiness calculation
      const iconDiv = iconTemplate.cloneNode(true);
      iconDiv.innerHTML = `
                <fxs-icon data-icon-id="${config.icons[0]}" class="size-6 mr-1"></fxs-icon>
                <strong>+${totalCount.total}</strong>
            `;
      totalDiv.appendChild(iconDiv);
    } else if (l10nId === "LOC_PROJECT_TOWN_URBAN_CENTER_NAME") {
      // Special handling for Urban Center to show calculated total with base bonus and era multiplier
      config.icons.forEach((iconId) => {
        const iconDiv = iconTemplate.cloneNode(true);
        iconDiv.innerHTML = `
                    <fxs-icon data-icon-id="${iconId}" class="size-6 mr-1"></fxs-icon>
                    <strong>+${totalCount.total}</strong>
                `;
        totalDiv.appendChild(iconDiv);
      });

      // If we need to update the yield values in the main tooltip UI, we could do it here:
      // Find and update the bonus values in the original tooltip display
      setTimeout(() => {
        const yieldItems = tooltip.querySelectorAll(".yield-item .text");
        if (yieldItems && yieldItems.length > 0) {
          for (let i = 0; i < yieldItems.length; i++) {
            const yieldItem = yieldItems[i];
            if (yieldItem) {
              yieldItem.textContent = `+${totalCount.total}`;
            }
          }
        }
      }, 0);
    } else {
      // Regular handling for other focus types
      config.icons.forEach((iconId) => {
        const iconDiv = iconTemplate.cloneNode(true);
        iconDiv.innerHTML = `
                    <fxs-icon data-icon-id="${iconId}" class="size-6 mr-1"></fxs-icon>
                    <strong>+${totalCount.total}</strong>
                `;
        totalDiv.appendChild(iconDiv);
      });
    }
    newInfo.appendChild(totalDiv);

    // Style the breakdown section
    const breakdownDiv = document.createElement("div");
    breakdownDiv.style.cssText = `
            font-size: ${getScaledFontSize(FONT_SIZES.MEDIUM)};
            color: #bbb;
            margin-left: 4px;
            padding-top: 4px;
            line-height: 1.8;
        `;

    if (totalCount.details) {
      if (totalCount.details.breakdown !== undefined) {
        const parts = totalCount.details.breakdown
          .map(
            ({label, count, names}) => `
                        <div style="margin: 4px 0;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>${label}</span>
                                <span style="color: #fff;">${count}</span>
                            </div>
                            ${
                              names
                                ? `
                                <div style="padding-left: 12px; font-size: ${getScaledFontSize(
                                  FONT_SIZES.SMALL
                                )}; color: #aaa;">
                                    ${names.join(", ")}
                                </div>
                            `
                                : ""
                            }
                        </div>
                    `
          )
          .join("");

        breakdownDiv.innerHTML = `
                    <div style="margin-bottom: 4px;">${
                      totalCount.details.label
                    }:</div>
                    ${parts}
                    <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <span>${Locale.compose(
                          "LOC_MOD_ETFI_BONUS_PER_CONNECTION"
                        )}</span>
                        <span style="color: #fff;">x${
                          typeof totalCount.multiplier === "number"
                            ? totalCount.multiplier
                            : 0
                        }</span>
                    </div>
                `;
      } else if (totalCount.details.quarters !== undefined) {
        // Urban Center calculation breakdown

        // Group quarters by type
        const uniqueQuarters = totalCount.details.quarters.filter(
          (q) => q.isUnique
        );
        const specialQuarters = totalCount.details.quarters.filter(
          (q) => q.isSpecial && !q.isUnique
        );
        const fullTileQuarters = totalCount.details.quarters.filter(
          (q) => q.isFullTile
        );
        const buildingQuarters = totalCount.details.quarters.filter(
          (q) => !q.isSpecial && !q.isFullTile
        );

        let content = "";

        // Show unique quarters if any exist
        if (uniqueQuarters.length > 0) {
          content += `
                        <div style="margin-bottom: 8px;">
                            <div style="color: #fff; margin-bottom: 4px;">${
                              L10N.UNIQUE_QUARTERS
                            }:</div>
                            ${uniqueQuarters
                              .map((quarter) => {
                                const quarterName = quarter.quarterName
                                  ? Locale.compose(quarter.quarterName)
                                  : "Unique Quarter";
                                const civName = quarter.civName
                                  ? Locale.compose(quarter.civName)
                                  : "";
                                return `
                                    <div style="padding-left: 8px;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>${quarterName} ${
                                  civName ? `(${civName})` : ""
                                }</span>
                                            <span style="color: #fff;">+1</span>
                                        </div>
                                        <div style="padding-left: 8px; font-size: ${getScaledFontSize(
                                          FONT_SIZES.SMALL
                                        )}; color: #aaa;">
                                            ${quarter.buildings
                                              .map((b) => Locale.compose(b))
                                              .join(" + ")}
                                        </div>
                                    </div>
                                `;
                              })
                              .join("")}
                        </div>
                    `;
        }

        // Show special quarters if any exist
        if (specialQuarters.length > 0) {
          content += `
                        <div style="margin-bottom: 8px;">
                            <div style="color: #fff; margin-bottom: 4px;">${
                              L10N.SPECIAL_QUARTERS
                            }:</div>
                            ${specialQuarters
                              .map((quarter) => {
                                // Get localized building name
                                const buildingName = Locale.compose(
                                  quarter.buildings[0]
                                );
                                return `
                                    <div style="padding-left: 8px;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>${buildingName}</span>
                                            <span style="color: #fff;">+1</span>
                                        </div>
                                    </div>
                                `;
                              })
                              .join("")}
                        </div>
                    `;
        }

        // Show full-tile quarters if any exist
        if (fullTileQuarters.length > 0) {
          content += `
                        <div style="margin-bottom: 8px;">
                            <div style="color: #fff; margin-bottom: 4px;">${
                              L10N.FULL_TILE_QUARTERS
                            }:</div>
                            ${fullTileQuarters
                              .map((quarter) => {
                                // Get localized building name
                                const buildingName = Locale.compose(
                                  quarter.buildings[0]
                                );
                                return `
                                    <div style="padding-left: 8px;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>${buildingName}</span>
                                            <span style="color: #fff;">+1</span>
                                        </div>
                                    </div>
                                `;
                              })
                              .join("")}
                        </div>
                    `;
        }

        // Show building quarters if any exist
        if (buildingQuarters.length > 0) {
          content += `
                        <div style="margin-top: ${
                          uniqueQuarters.length ||
                          specialQuarters.length ||
                          fullTileQuarters.length
                            ? "8px"
                            : "0"
                        };">
                            <div style="color: #fff; margin-bottom: 4px; font-size: ${getScaledFontSize(
                              FONT_SIZES.MEDIUM
                            )};">${L10N.BUILDING_QUARTERS}:</div>
                            ${buildingQuarters
                              .map((quarter) => {
                                // Get localized building names
                                const buildingNames = quarter.buildings.map(
                                  (b) => Locale.compose(b)
                                );
                                return `
                                    <div style="padding-left: 8px;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <div style="font-size: ${getScaledFontSize(
                                              FONT_SIZES.SMALL
                                            )}; color: #bbb;">
                                                ${buildingNames.join(" + ")}
                                            </div>
                                            <span style="color: #fff;">+${
                                              quarter.contribution ?? 1
                                            }</span>

                                        </div>
                                    </div>
                                `;
                              })
                              .join("")}
                        </div>
                    `;
        }

        // Add era multiplier at the bottom
        if (totalCount.details.multiplier > 1) {
          content += `
                        <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <span>${L10N.ERA_BONUS}</span>
                            <span style="color: #fff;">x${totalCount.details.multiplier}</span>
                        </div>
                    `;
        }

        breakdownDiv.innerHTML = content;
      } else if (
        totalCount.details.text !== undefined ||
        totalCount.details.label !== undefined
      ) {
        breakdownDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${
                          totalCount.details.label || totalCount.details.text
                        }</span>
                        <span style="color: #fff;">${
                          totalCount.details.count
                        }</span>
                    </div>
                `;
      } else if (totalCount.details.resources !== undefined) {
        const resources = totalCount.details.resources
          .map(({name, count, iconId}) => {
            const iconCSS =
              UI.getIconCSS(iconId) ||
              UI.getIconCSS("RESOURCE_GENERIC") ||
              "none";
            const iconSize =
              window.devicePixelRatio > 1 || window.innerWidth > 2560 ? 64 : 40;
            return `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
                                <div style="display: flex; align-items: center;">
                                    <div style="
                                        width: ${iconSize}px; 
                                        height: ${iconSize}px; 
                                        background-image: ${iconCSS}; 
                                        background-size: contain; 
                                        background-repeat: no-repeat; 
                                        background-position: center;
                                        flex-shrink: 0;
                                    "></div>
                                    <span style="
                                        font-size: ${getScaledFontSize(
                                          FONT_SIZES.MEDIUM
                                        )}; 
                                        color: #fff;
                                        margin-left: 20px;
                                        padding-right: 12px;
                                    ">${name}</span>
                                </div>
                                <span style="
                                    color: #fff; 
                                    font-size: ${getScaledFontSize(
                                      FONT_SIZES.MEDIUM
                                    )}; 
                                    margin-left: auto;
                                ">+${count}</span>
                            </div>
                        `;
          })
          .join("");

        breakdownDiv.innerHTML = `
                    <div style="margin-bottom: 16px; font-size: ${getScaledFontSize(
                      FONT_SIZES.MEDIUM
                    )}; color: #fff;">
                        ${Locale.compose("LOC_MOD_ETFI_TOTAL_RESOURCES")}: ${
          totalCount.details.resourceCount
        }
                    </div>
                    ${resources}
                    <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.3); font-size: ${getScaledFontSize(
                      FONT_SIZES.MEDIUM
                    )};">
                        <span>${Locale.compose(
                          "LOC_MOD_ETFI_HAPPINESS_PER_RESOURCE"
                        )}</span>
                        <span style="color: #fff;">x2</span>
                    </div>
                `;
      } else {
        // Improvements breakdown
        const parts = Object.entries(totalCount.details)
          .map(
            ([name, count]) => `
                        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                            <span>${name}</span>
                            <span style="color: #fff;">+${count}</span>
                        </div>
                    `
          )
          .join("");

        let content = parts;
        if (totalCount.multiplier > 1) {
          content += `
                        <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <span>${Locale.compose(
                              "LOC_MOD_ETFI_ERA_BONUS"
                            )}</span>
                            <span style="color: #fff;">x${
                              totalCount.multiplier
                            }</span>
                        </div>
                    `;
        }
        breakdownDiv.innerHTML = content;
      }
      newInfo.appendChild(breakdownDiv);
    }

    if (ETFI_IS_UPDATING) return;
    ETFI_IS_UPDATING = true;

    try {
        content.appendChild(newInfo); 
    } finally {
        ETFI_IS_UPDATING = false;
    }
  }

  function startTooltipObserver() {
    log("Starting tooltip observer...");

    const tooltipContainer = 
      document.querySelector(".tooltip-container") || document.body;
    log("Found tooltip container:", tooltipContainer ? "yes" : "no");

    if (state.tooltipObserver) state.tooltipObserver.disconnect();
    if (state.contentObserver) state.contentObserver.disconnect();

    state.tooltipObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        for (const node of mutation.removedNodes) {
          if (node.nodeName === "FXS-TOOLTIP") {
            log("Tooltip removed:", node);
            clearTooltipContent(node);
            if (state.lastTooltip === node) {
              state.lastTooltip = null;
              clearResourceCache();
              clearRuralTileCache();
              clearBuildingCache();
            }
          }
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeName === "FXS-TOOLTIP") {
            log("New tooltip detected:", node);
            // Wait for next frame to check visibility
            requestAnimationFrame(() => {
              if (node.offsetParent !== null) {
                // Check if actually visible in DOM
                log("Tooltip is visible, setting up observers");
                observeTooltipContent(node);
                modifyTooltip(node);
              } else {
                log("Tooltip is not visible in DOM");
              }
            });
          }
        }
      }
    });

    state.tooltipObserver.observe(tooltipContainer, {
      childList: true,
      subtree: true,
    });
    log("Tooltip observer started");
  }

  function getCityID() {
    // First try getting selected city
    let gcity = UI.Player.getHeadSelectedCity();
    if (gcity?.id) {
      return gcity;
    }

    // If no selected city, try getting city from tooltip
    const tooltip = document.querySelector("fxs-tooltip.plot-tooltip");
    if (!tooltip) return null;

    const plotCoord = {
      x: parseInt(tooltip.getAttribute("data-plot-x")),
      y: parseInt(tooltip.getAttribute("data-plot-y")),
    };

    if (isNaN(plotCoord.x) || isNaN(plotCoord.y)) return null;

    const city = GameplayMap.getCityAt(plotCoord.x, plotCoord.y);
    return city;
  }

  // After your state initialization
  Loading.runWhenFinished(() => {
    log("Loading finished, starting initialization...");

    // Preload yield icons
    log("Preloading yield icons...");
    Object.values(TOOLTIPS.configs).forEach((config) => {
      config.icons.forEach((iconId) => {
        const iconUrl = UI.getIcon(iconId, "YIELD");
        if (iconUrl) {
          log("Preloading yield icon:", iconId);
          Controls.preloadImage(iconUrl, "town-focus-tooltip");
        }
      });
    });

    // Preload resource icons - do this before caching any tooltips
    log("Preloading resource icons...");
    GameInfo.Resources.forEach((resource) => {
      const iconUrl = UI.getIcon(resource.ResourceType);
      if (iconUrl) {
        log("Preloading resource icon:", resource.ResourceType);
        Controls.preloadImage(iconUrl, "town-focus-tooltip");
      }
    });

    // Start your tooltip observer after resources are loaded
    log("Starting tooltip observer...");
    startTooltipObserver();

    // Add a check to ensure the observer is running
    setTimeout(() => {
      if (!state.tooltipObserver) {
        log("WARNING: Tooltip observer not started, retrying...");
        startTooltipObserver();
      } else {
        log("Tooltip observer confirmed running");
      }
    }, 1000);
  });

  // Add a fallback initialization
  window.addEventListener("load", () => {
    log("Window loaded, checking if initialization is needed...");
    if (!state.tooltipObserver) {
      log("Tooltip observer not found, starting initialization...");
      Loading.runWhenFinished(() => {
        startTooltipObserver();
      });
    }
  });

  log("ETFI Initialization complete");
})();
