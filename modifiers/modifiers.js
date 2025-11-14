/**
 * Modifier/Requirement resolver utilities
 * ---------------------------------------
 * Author: leonardfactory
 * 
 * These helpers read Civ7 "database" tables exposed on `GameInfo.*` and
 * convert raw rows (Modifiers, Arguments, RequirementSets, etc.) into
 * structured, easier-to-use objects for UI or gameplay logic.
 *
 * Key ideas:
 * - A Modifier may reference requirement sets (owner/subject) and has an entry
 *   in `GameInfo.DynamicModifiers` that defines Effect/Collection types.
 * - Arguments for Modifiers and Requirements are stored separately; we load and
 *   re-key them by argument Name for quicker lookups.
 * - The returned "Resolved" shapes include a small helper (`getAsserted`) that
 *   throws if a required argument is missing (useful for debugging wrong data).
 *
 * No external side effects: all functions are pure readers of GameInfo.* and
 * return plain objects suitable for rendering and downstream calculations.
 *
 * ---------------------------------------------------------------------------
 * Minimal type glossary (best-effort; matches Civ7 JSON-like tables):
 * ---------------------------------------------------------------------------
 * @typedef {Object} Modifier
 * @property {string} ModifierId               // e.g. "MOD_FARM_FOOD_BONUS"
 * @property {string} ModifierType             // links to DynamicModifiers.ModifierType
 * @property {string|null} SubjectRequirementSetId
 * @property {string|null} OwnerRequirementSetId
 *
 * @typedef {Object} DynamicModifier
 * @property {string} ModifierType             // matches Modifier.ModifierType
 * @property {string} CollectionType           // e.g. "COLLECTION_CITY_PLOTS"
 * @property {string} EffectType               // e.g. "EFFECT_ADJUST_YIELD"
 *
 * @typedef {Object} ModifierArgument
 * @property {string} ModifierId
 * @property {string} Name                     // key, e.g. "Amount", "YieldType"
 * @property {any}    Value                    // payload (string/number/hash)
 *
 * @typedef {Object} Requirement
 * @property {string} RequirementId
 * @property {string} RequirementType
 *
 * @typedef {Object} RequirementArgument
 * @property {string} RequirementId
 * @property {string} Name
 * @property {any}    Value
 *
 * @typedef {Object} RequirementSet
 * @property {string} RequirementSetId
 * @property {string} RequirementSetType      // "REQUIREMENTSET_TEST_ALL"/"ANY", etc.
 *
 * @typedef {Object} RequirementSetRequirement
 * @property {string} RequirementSetId
 * @property {string} RequirementId
 *
 * ---------------------------------------------------------------------------
 * Resolved shapes (produced by this module):
 * ---------------------------------------------------------------------------
 * @typedef {Object.<string, { Value:any }>} BaseResolvedArguments
 *   // Map keyed by argument Name; each entry is the original row minus "Name".
 *
 * @typedef {BaseResolvedArguments & {
 *   getAsserted(key: string): any            // returns Value or throws if missing/empty
 * }} ResolvedArguments
 *
 * @typedef {Object} ResolvedRequirement
 * @property {Requirement}       Requirement
 * @property {ResolvedArguments} Arguments
 *
 * @typedef {RequirementSet & {
 *   Requirements: ResolvedRequirement[]
 * }} ResolvedRequirementSet
 *
 * @typedef {Object} ResolvedModifier
 * @property {Modifier}                Modifier
 * @property {ResolvedArguments}       Arguments
 * @property {string|undefined}        CollectionType   // from DynamicModifiers
 * @property {string|undefined}        EffectType       // from DynamicModifiers
 * @property {ResolvedRequirementSet|null} SubjectRequirementSet
 * @property {ResolvedRequirementSet|null} OwnerRequirementSet
 */

/**
 * Look up and resolve a Modifier by its string ID.
 * Convenience wrapper around `resolveModifier`.
 *
 * @param {string} modifierId  A concrete row key from GameInfo.Modifiers.ModifierId
 * @returns {ResolvedModifier} Fully resolved modifier structure
 */
export function resolveModifierById(modifierId) {
  const modifier = GameInfo.Modifiers.find(m => m.ModifierId === modifierId);
  // If data is missing, `resolveModifier` will still try to surface useful errors.
  // @ts-ignore - `resolveModifier` returns a typed ResolvedModifier at runtime.
  return resolveModifier(modifier);
}

/**
 * Convert a list of argument rows into an object keyed by argument Name.
 * Adds a small helper `getAsserted(key)` to retrieve required values safely.
 *
 * Example output shape:
 * {
 *   Amount: { Value: 2, ...rowFields },
 *   YieldType: { Value: "YIELD_FOOD", ... },
 *   getAsserted(key) { ... }
 * }
 *
 * @param {string} description  For error messages (e.g., "modifier MOD_...").
 * @param {(ModifierArgument | RequirementArgument)[]} args  Flat list of rows.
 * @returns {ResolvedArguments} Re-keyed map with `getAsserted`.
 */
function createResolvedArguments(description, args) {
  /** @type {BaseResolvedArguments} */
  const resolvedArgs = args.reduce((acc, ma) => {
    // Pull off the Name (key) and keep the rest of the fields (Value, etc.)
    const { Name, ...argument } = ma;
    acc[Name] = argument;
    return acc;
  }, /** @type {BaseResolvedArguments} */ ({}));

  // Extend with a tiny helper to fail loudly when a required argument is missing.
  // @ts-ignore
  return {
    ...resolvedArgs,
    getAsserted(key) {
      if (!resolvedArgs[key]?.Value) {
        throw new Error(`Missing argument "${key}" in ${description}`);
      }
      return resolvedArgs[key].Value;
    }
  };
}

/**
 * Resolve a single Modifier row into a full, ready-to-use object:
 * - Collects and re-keys all ModifierArguments for quick access.
 * - Resolves linked Subject/Owner requirement sets (if present).
 * - Reads DynamicModifiers to attach CollectionType and EffectType.
 *
 * Logs console errors for any missing DynamicModifier or requirement pieces,
 * but still returns whatever it can resolve to keep the UI responsive.
 *
 * @param {Modifier} modifier
 * @returns {ResolvedModifier}
 */
export function resolveModifier(modifier) {
  const m = modifier;

  // Requirement sets are optional; if IDs are null/undefined, we return null.
  const SubjectRequirementSet = resolveRequirementSet(m.SubjectRequirementSetId);
  const OwnerRequirementSet   = resolveRequirementSet(m.OwnerRequirementSetId);

  // Join with the dynamic meta that describes how this modifier applies.
  const DynamicModifier = GameInfo.DynamicModifiers.find(
    dm => dm.ModifierType === m.ModifierType
  );
  if (!DynamicModifier) {
    console.error(`DynamicModifier not found for Modifier: ${m.ModifierId}`);
  }

  return {
    Modifier: m,

    // All modifier arguments, re-keyed by Name with an assertion helper.
    // @ts-ignore
    Arguments: createResolvedArguments(
      `modifier ${m.ModifierId}`,
      GameInfo.ModifierArguments.filter(ma => ma.ModifierId === m.ModifierId)
    ),

    // Optional meta (undefined if missing from the data set)
    CollectionType: DynamicModifier?.CollectionType,
    EffectType: DynamicModifier?.EffectType,

    // Optional resolved requirement sets
    SubjectRequirementSet,
    OwnerRequirementSet,
  };
}

/**
 * Resolve a RequirementSet into a structure that contains:
 * - The requirement set row itself (type, id)
 * - A list of fully resolved Requirements with their own arguments
 *
 * Returns `null` if the input is falsy or the set cannot be found,
 * logging an error for visibility in the latter case.
 *
 * @param {string | null | undefined} requirementSetId
 * @returns {ResolvedRequirementSet | null}
 */
export function resolveRequirementSet(requirementSetId) {
  if (!requirementSetId) {
    return null;
  }

  // Collect all Requirement rows that belong to this set,
  // resolving each one's arguments along the way.
  const Requirements = GameInfo.RequirementSetRequirements
    .filter(rs => rs.RequirementSetId === requirementSetId)
    .map(rs => {
      const requirement = GameInfo.Requirements.find(
        r => r.RequirementId === rs.RequirementId
      );
      if (!requirement) {
        console.error(
          `Requirement not found for RequirementSetRequirement: ${rs.RequirementId}`
        );
        return null;
      }

      return {
        Requirement: requirement,
        Arguments: createResolvedArguments(
          `requirement ${requirement.RequirementId}`,
          GameInfo.RequirementArguments.filter(
            ra => ra.RequirementId === requirement.RequirementId
          )
        ),
      };
    })
    .filter(r => r != null);

  // Finally, pull the set row itself (type, id).
  const RequirementSet = GameInfo.RequirementSets.find(
    rs => rs.RequirementSetId == requirementSetId
  );
  if (!RequirementSet) {
    console.error(`RequirementSet not found: ${requirementSetId}`);
    return null;
  }

  return {
    ...RequirementSet,
    Requirements
  };
}
