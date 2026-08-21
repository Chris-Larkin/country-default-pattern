const ISO_ALPHA_2 = /^[A-Z]{2}$/i;

/**
 * Normalise an optional ISO 3166-1 alpha-2 country hint.
 *
 * This validates the shape only. Membership is checked against the host's
 * supplied country list so this project never needs to own country data.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normaliseCountryHint(value) {
  if (typeof value !== "string") return null;

  const code = value.trim();
  return ISO_ALPHA_2.test(code) ? code.toUpperCase() : null;
}

/**
 * Split one hinted country from a host-owned, already ordered country list.
 *
 * The function is pure: it does not mutate the input, sort, select a value, or
 * perform inference. If duplicate codes exist, the first item becomes the
 * suggestion and all copies are removed from the remaining group.
 *
 * @template {{ code: unknown }} T
 * @param {readonly T[]} countries
 * @param {unknown} countryHint
 * @returns {{ suggested: T[], remaining: T[] }}
 */
export function partitionCountrySuggestion(countries, countryHint) {
  if (!Array.isArray(countries)) {
    throw new TypeError("countries must be an array");
  }

  const hint = normaliseCountryHint(countryHint);
  if (!hint) return { suggested: [], remaining: [...countries] };

  const match = countries.find(
    (country) => normaliseCountryHint(country?.code) === hint,
  );

  if (!match) return { suggested: [], remaining: [...countries] };

  return {
    suggested: [match],
    remaining: countries.filter(
      (country) => normaliseCountryHint(country?.code) !== hint,
    ),
  };
}
