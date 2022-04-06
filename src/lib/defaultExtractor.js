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
  yield regex.pattern([
    // Variants
    /((?=([^\s"'\\\[]+:))\2)?/,

    regex.any([
      // Arbitrary properties
      /!?\[[^\s:'"]+:[^\s\]]+\]/,

      // Utilities
      regex.pattern([
        // Utility Name / Group Name
        /!?-?(?:\w+)/,

        // Normal/Arbitrary values
        regex.optional(regex.any([
          regex.pattern([
            // Arbitrary values with quotes
            /-\[['"][^\s]+?['"]\]/,

            // optionally followed by an opacity modifier
            /(?:\/[^\s'"\\$]*)?/,
          ]),

          regex.pattern([
            // Arbitrary values w/o quotes
            /-\[[^\s]+\]/,

            // optionally followed by an opacity modifier
            /(?:\/[^\s'"\\$]*)?/,
          ]),

          // Normal values w/o quotes — may include an opacity modifier
          /[-\/][^\s'"\\$=]*/,
        ]))
      ]),
    ]),
  ])

  // 5. Inner matches
  // yield /[^<>"'`\s.(){}[\]#=%$]*[^<>"'`\s.(){}[\]#=%:$]/g
}

// Regular utilities
// {{modifier}:}*{namespace}{-{suffix}}*{/{opacityModifier}}?

// Arbitrary values
// {{modifier}:}*{namespace}-[{arbitraryValue}]{/{opacityModifier}}?
// arbitraryValue: no whitespace, balanced quotes unless within quotes, balanced brackets unless within quotes

// Arbitrary properties
// {{modifier}:}*[{validCssPropertyName}:{arbitraryValue}]
