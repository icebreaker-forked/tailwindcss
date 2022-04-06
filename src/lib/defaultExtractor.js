import * as regex from "./regex"

/**
 * @param {any} context
 */
export function defaultExtractor(context) {
  let patterns = Array.from(buildRegExps(context))

  /**
   * @param {string} content
   */
  return content => {
    /** @type {(string|string)[]} */
    let results = []

    for (let pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        results.push(...match)
      }
    }

    return results.filter((v) => v !== undefined)
  }
}

/**
 * @param {any} context
 */
function* buildRegExps(context) {
  let utilities = context.getUtilityPrefixes()
  let variantSeparator = regex.escape(context.tailwindConfig.separator)

  // Matches hover:, focus:, hover:focus:, etc…
  // Accounts for the configured variant separator
  let variants = regex.optional([
    /[^\s\\'"]+/,
    variantSeparator,
  ])

  // Important prefix modifier
  // !underline, !text-red-500, …
  let maybeImportant = /!?/

  // Negative modifier for a utility
  // -translate-x-full, -mx-4, …
  let maybeNegative = /-?/

  // A prefix (if one is configured)
  let maybePrefix =  regex.escape(context.tailwindConfig.prefix)

  // Matches singular utilities
  // sr-only, border, underline, …
  let singularUtilities = regex.any(
    utilities.singular
      .sort((a, b) => (b.length - a.length) || a.localeCompare(b))
      .map(regex.escape)
  )

  // Matches utility groups
  // border-*, border-r-*, …
  let groupedUtilities = regex.any(
    utilities.groups
      .sort((a, b) => (b.length - a.length) || a.localeCompare(b))
      .map(regex.escape)
  )

  let maybeOpacityModifier = regex.optional(regex.any([
    // ORDER IS IMPORTANT HERE :)

    // Arbitrary opacity modifier
    // e.g. `text-red-500/[.5]`
    /\/\[[^\s]+\]/,

    // Known opacity modifier
    // e.g. `text-red-500/50`
    /\/[^\s\\'"\[]+/,

    // Empty opacity modifier
    // e.g. `text-red-500/`
    /\//,
  ]))

  // Zero length assertion ensuring a class is followed by something that is definitely not part of this class
  // (or end of the line)
  let followedByNonClassThing = /(?=[<>"'`\s]|$)/

  yield regex.pattern([
    // Variants
    variants,

    // Important utilities (!underline, hover:!underline, etc…)
    maybeImportant,

    // Negative utilities (-inset-1, -tw-inset-1)
    maybeNegative,

    maybePrefix,

    // Negative utilities (tw--inset-1)
    maybeNegative,

    '(?:',
      `(?:\\b|${regex.escape(context.tailwindConfig.separator)}?)`,
      // Utility Groups
      '(?:',
        '(?:',
          regex.any([
            singularUtilities,
            groupedUtilities,
          ]),
        ')',

        '(?:',
          '(?:',
            // Utility values the `5` in `inset-x-5`
            /[^\s\\'"=\[]+/,

            // or…
            '|',

            // Arbitrary values like the `['foo']` in `inset-x-['foo']`
            /\[[^\s]+\]/,
          ')',

          // Followed by an optional color opacity modifier
          regex.optional(regex.any([
            // ORDER IS IMPORTANT HERE :)

            // Arbitrary opacity modifier
            // e.g. `text-red-500/[.5]`
            /\/\[[^\s]+\]/,

            // Known opacity modifier
            // e.g. `text-red-500/50`
            /\/[^\s\\'"\[]+/,

            // Empty opacity modifier
            // e.g. `text-red-500/`
            /\//,
          ])),
        ')?',
      ')',

      // Or arbitrary properties like the `[text-shadow:0_0_1px_magenta]`
      '|',
      /\[[^\s:'"]+:[^\s\]]+\]/,
    ')',

    // Followed by something that is definitely not part of this class
    followedByNonClassThing,
  ])

  /*
  // 1. Singular utilities
  yield regex.pattern([
    // hover:, hover:focus:, hover:active:, etc…
    variants,

    // Important utilities (!underline, hover:!underline, etc…)
    maybeImportant,

    // Negative utilities (before prefix: -inset-1, -tw-inset-1)
    maybeNegative,

    // A prefix (if one is configured)
    maybePrefix,

    // Negative utilities (after prefix: tw--inset-1)
    maybeNegative,

    // sr-only, border, border-, border-r-, border-l-, etc…
    singularUtilities,

    // NOT followed by a hyphen because that'd be a grouped utility
    /(?!-)/,

    // Followed by an optional color opacity modifier
    maybeOpacityModifier,

    // Followed by something that is definitely not part of this class
    // For example this prevents border-r from matching border-red-500 unless it's "by itself"
    followedByNonClassThing,
  ])

  // 2. Grouped utilities
  yield regex.pattern([
    // hover:, hover:focus:, hover:active:, etc…
    variants,

    // Important utilities (!underline, hover:!underline, etc…)
    maybeImportant,

    // Negative utilities (before prefix: -inset-1, -tw-inset-1)
    maybeNegative,

    // A prefix (if one is configured)
    maybePrefix,

    // Negative utilities (after prefix: tw--inset-1)
    maybeNegative,

    // border-, border-r-, border-l-, etc…
    groupedUtilities,

    // Utility values the `5` in `inset-x-5`
    // optional for utilities that are not a group
    // Can't contain `[` because that means it's part of an arbitrary value
    /-/,
    /[^\s\\'"=\[\/]+/,

    // Followed by an optional color opacity modifier
    maybeOpacityModifier,

    // Followed by something that is definitely not part of this class
    // For example this prevents border-r from matching border-red-500 unless it's "by itself"
    followedByNonClassThing,
  ])

  // 3. Arbitrary value utilities
  yield regex.pattern([
    // hover:, hover:focus:, hover:active:, etc…
    variants,

    // Important utilities (!underline, hover:!underline, etc…)
    maybeImportant,

    // Negative utilities (before prefix: -inset-1, -tw-inset-1)
    maybeNegative,

    // A prefix (if one is configured)
    maybePrefix,

    // Negative utilities (before prefix: -inset-1, -tw-inset-1)
    maybeNegative,

    // sr-only, border, border-, border-r-, border-l-, etc…
    groupedUtilities,

    // Arbitrary values like the `['foo']` in `inset-x-['foo']`
    // TODO: This treats w-[foo]w-[bar] as two separate values when it should be treated as a single value
    /-/,
    /\[[^\s]+\]/,
    // regex.nestedBrackets('[', ']', 3),

    // Followed by an optional color opacity modifier
    maybeOpacityModifier,
  ])

  // 4. Arbitrary property utilities
  yield regex.pattern([
    // hover:, hover:focus:, hover:active:, etc…
    variants,

    // // Important utilities (!underline, hover:!underline, etc…)
    maybeImportant,

    // // A prefix (if one is configured)
    maybePrefix,

    // Not preceded by a hyphen because that'd be part of a grouped utility with a type clarification
    // TODO: Check this with a prefix that has a hyphen
    // Maybe positive assertion for preceded by prefix or non-hyphen
    // For example: w-[length:12px]
    /(?<!-)/,

    // // Arbitrary properties like the `[text-shadow:0_0_1px_magenta]`
    /\[[^\s:'"]+:[^\s\]]+\]/,

    // Followed by something that is definitely not part of this class
    followedByNonClassThing,
  ])

  // 5. Inner matches
  yield /[^<>"'`\s.(){}[\]#=%$]*[^<>"'`\s.(){}[\]#=%:$]/g
  */
}

// Regular utilities
// {{modifier}:}*{namespace}{-{suffix}}*{/{opacityModifier}}?

// Arbitrary values
// {{modifier}:}*{namespace}-[{arbitraryValue}]{/{opacityModifier}}?
// arbitraryValue: no whitespace, balanced quotes unless within quotes, balanced brackets unless within quotes

// Arbitrary properties
// {{modifier}:}*[{validCssPropertyName}:{arbitraryValue}]
