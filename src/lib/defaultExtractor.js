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
    /((?=([^\s"'\\\[]+:))\2)?/,

    // Arbitrary properties or utilities
    '(?:',
      // Arbitrary properties
      /!?\[[^\s:'"]+:[^\s\]]+\]/,
      '|',
      // Utilities or Utility Groups
      /!?-?(?:\w+)/,
      // Utility values or Arbitrary values
      '(?:',
        // Arbitrary values with quotes — may be followed by an opacity modifier
        /-\[['"][^\s]+?['"]\](?:\/[^\s'"\\$]*)?/,
        '|',
        // Arbitrary values w/o quotes — may be followed by an opacity modifier
        /-\[[^\s]+\](?:\/[^\s'"\\$]*)?/,
        '|',
        // Normal values w/o quotes — may include an opacity modifier
        /[-\/][^\s'"\\$=]*/,
      ')?',
    ')',
  ].join(''), 'g')

  // 5. Inner matches
  yield /[^<>"'`\s.(){}[\]#=%$]*[^<>"'`\s.(){}[\]#=%:$]/g
}

// Regular utilities
// {{modifier}:}*{namespace}{-{suffix}}*{/{opacityModifier}}?

// Arbitrary values
// {{modifier}:}*{namespace}-[{arbitraryValue}]{/{opacityModifier}}?
// arbitraryValue: no whitespace, balanced quotes unless within quotes, balanced brackets unless within quotes

// Arbitrary properties
// {{modifier}:}*[{validCssPropertyName}:{arbitraryValue}]
