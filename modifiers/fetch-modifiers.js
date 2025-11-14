import { resolveModifier } from "./modifiers.js";

/**
 * Modifier lookup utilities for Traditions, Attributes, and City-State Bonuses
 * ---------------------------------------------------------------------------
 * Author: leonardfactory
 *
 * These helpers traverse Civ7 data tables exposed on `GameInfo.*` to find all
 * Modifiers that are unlocked by:
 *   - a specific Tradition (`GameInfo.TraditionModifiers`)
 *   - a specific Attribute/Progression Tree Node
 *     (`GameInfo.ProgressionTreeNodeUnlocks`, filtered to KIND_MODIFIER)
 *   - a specific City-State bonus (`GameInfo.CityStateBonusModifiers`)
 *
 * Each function returns Modifiers already “resolved” into rich objects by
 * `resolveModifier` (see ./modifiers.js), which attaches:
 *   - re-keyed Arguments map with `getAsserted(...)`
 *   - Subject/Owner requirement sets (resolved)
 *   - DynamicModifiers metadata (EffectType, CollectionType)
 *
 * Data tables touched:
 *   - GameInfo.TraditionModifiers           (TraditionType -> ModifierId)
 *   - GameInfo.ProgressionTreeNodeUnlocks   (ProgressionTreeNodeType -> TargetKind/TargetType)
 *   - GameInfo.CityStateBonusModifiers      (CityStateBonusType -> ModifierID)
 *   - GameInfo.Modifiers                    (rows to resolve)
 *
 * Return shape:
 *   - `ResolvedModifier[] | null` (null when the input is falsy)
 *
 * Notes:
 *   - We use `Set` to deduplicate modifier ids before resolving.
 *   - These functions are pure readers and do not mutate game state.
 */

/**
 * Obtain all resolved modifiers granted by a given Tradition.
 *
 * @param {string | null} traditionType  A row key from GameInfo.Traditions (e.g., "TRADITION_PIETY")
 * @returns {ResolvedModifier[] | null}  Array of resolved modifiers, or null if no input
 */
export function getModifiersForTradition(traditionType) {
  if (!traditionType) {
    return null;
  }

  // Gather ModifierIds linked to this Tradition.
  const traditionModifiers = new Set(
    GameInfo.TraditionModifiers
      .filter(tm => tm.TraditionType === traditionType)
      .map(tm => tm.ModifierId)
  );

  // Resolve each corresponding Modifier row.
  const modifiers = GameInfo.Modifiers
    .filter(m => traditionModifiers.has(m.ModifierId))
    .map(m => resolveModifier(m));

  return modifiers;
}

/**
 * Obtain all resolved modifiers unlocked by a given Attribute / Progression Tree Node.
 * Only entries where TargetKind === "KIND_MODIFIER" are considered.
 *
 * @param {string | null} attributeType  A row key from GameInfo.ProgressionTreeNodes
 * @returns {ResolvedModifier[] | null}  Array of resolved modifiers, or null if no input
 */
export function getModifiersForAttribute(attributeType) {
  if (!attributeType) {
    return null;
  }

  // Collect ModifierIds referenced by the attribute node (as KIND_MODIFIER targets).
  const attributeModifiers = new Set(
    GameInfo.ProgressionTreeNodeUnlocks
      .filter(unlock =>
        unlock.TargetKind === "KIND_MODIFIER" &&
        unlock.ProgressionTreeNodeType === attributeType
      )
      .map(unlock => unlock.TargetType) // TargetType holds the ModifierId here
  );

  // Resolve each corresponding Modifier row.
  const modifiers = GameInfo.Modifiers
    .filter(m => attributeModifiers.has(m.ModifierId))
    .map(m => resolveModifier(m));

  return modifiers;
}

/**
 * Obtain all resolved modifiers associated with a City-State bonus type.
 *
 * @param {string} bonusType  A row key from GameInfo.CityStateBonuses (e.g., "CITY_STATE_BONUS_TRADE")
 * @returns {ResolvedModifier[] | null}  Array of resolved modifiers, or null if no input
 */
export function getCityStateBonusModifier(bonusType) {
  if (!bonusType) {
    return null;
  }

  // Collect ModifierIds (note the column name is ModifierID in this table).
  const bonusModifiers = new Set(
    GameInfo.CityStateBonusModifiers
      .filter(cs => cs.CityStateBonusType === bonusType)
      .map(cs => cs.ModifierID)
  );

  // Resolve each corresponding Modifier row.
  const modifiers = GameInfo.Modifiers
    .filter(m => bonusModifiers.has(m.ModifierId))
    .map(m => resolveModifier(m));

  return modifiers;
}
