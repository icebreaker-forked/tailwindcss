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
      for (let match of content.matchAll(pattern)) {
        results.push(...match)
      }
    }

    return results.filter((v) => v !== undefined).map(clipAtBalancedParens)
  }
}

/**
 * @param {any} context
 */
function* buildRegExps(context) {
  yield regex.pattern([
    // Variants
    /((?=([^\s"'\\\[]+:))\2)?/,

    // Important (optional)
    /!?/,

    regex.any([
      // Arbitrary properties
      /\[[^\s:'"]+:[^\s\]]+\]/,

      // Utilities
      regex.pattern([
        // Utility Name / Group Name
        /-?(?:\w+)/,

        // Normal/Arbitrary values
        regex.optional(regex.any([
          regex.pattern([
            // Arbitrary values
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

let SPECIALS = /[()\[\]{}'"`]/g
let ALLOWED_CLASS_CHARACTERS = /[^"'`\s<>]+/

/**
 * Clips a string ensuring that parentheses, quotes, etc… are balanced
 * Used for arbitrary values only
 *
 * We will go past the end of the balanced parens until we find a non-class character
 *
 * Depth matching behavior:
 * w-[calc(100%-theme('spacing[some_key][1.5]'))]']
 *   ┬    ┬          ┬┬       ┬        ┬┬   ┬┬┬┬┬┬┬
 *   1    2          3        4        34   3 210 END
 *   ╰────┴──────────┴────────┴────────┴┴───┴─┴┴┴
 *
 * @param {string} input
 */
function clipAtBalancedParens(input) {
  // We are care about this for arbitrary values
  if (! input.includes('-[')) {
    return input
  }

  SPECIALS.lastIndex = -1

  let depth = 0
  let openStringTypes = []

  // Find all parens, brackets, quotes, etc
  // Stop when we end at a balanced pair
  // This is naive and will treat mismatched parens as balanced
  // This shouldn't be a problem in practice though
  for (let match of input.matchAll(SPECIALS)) {
    let char = match[0]
    let inStringType = openStringTypes[openStringTypes.length - 1]

    if (char === inStringType) openStringTypes.pop()
    if (char === '\'' && inStringType !== char) openStringTypes.push(char)
    if (char === '"' && inStringType !== char) openStringTypes.push(char)
    if (char === '`' && inStringType !== char) openStringTypes.push(char)

    if (inStringType) {
      continue
    }

    if (char === '(') depth++
    if (char === '[') depth++
    if (char === '{') depth++
    if (char === ')') depth--
    if (char === ']') depth--
    if (char === '}') depth--

    // We've now hit an unbalanced bracket pair
    // We'll clip the string to before the character
    if (depth === 0) {
      let output = input.substring(0, match.index + 1)

      // Scan forwards until we find any non-class characters
      output += input.substring(match.index + 1).match(ALLOWED_CLASS_CHARACTERS)

      return output
    }
  }

  if (input.includes('h-[100px')) {
    console.log(input)
  }

  return input
}

// Regular utilities
// {{modifier}:}*{namespace}{-{suffix}}*{/{opacityModifier}}?

// Arbitrary values
// {{modifier}:}*{namespace}-[{arbitraryValue}]{/{opacityModifier}}?
// arbitraryValue: no whitespace, balanced quotes unless within quotes, balanced brackets unless within quotes

// Arbitrary properties
// {{modifier}:}*[{validCssPropertyName}:{arbitraryValue}]
