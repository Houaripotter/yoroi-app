// ============================================
// ICON TEST UTILITIES
// ============================================
// Emoji detection and validation helpers

// Regex covering major emoji Unicode ranges (excluding CJK/Japanese characters)
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{20E3}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;

// Emojis allowed in the codebase (not part of the icon migration)
// Includes text symbols, logger emojis, data labels, and their components
const ALLOWED_EMOJIS = new Set([
  '🎁', // achievement reward text
  '💧', // water card
  '🔐', // dev mode title text
  '🔒', // security labels
  '🔓', // unlock labels
  '🔥', // fire/motivation labels
  '💤', // sleep emoji
  '💡', // tip/hint text
  '🌍', // globe/location labels
  '🌙', // moon/night mode
  '🗓', '🗓️', // calendar in data config (EmptyState)
  '📋', // clipboard in data config
  '📖', // book in data config
  '📅', // calendar in logs
  '🔄', // refresh in logs
  '🔆', // brightness in logs
  '🖱', '🖱️', // mouse in logs
  '✓', '✅', '❌', '➕', // text symbols used in UI
  '️', // variation selector (part of compound emojis)
  // Regional indicator symbols (flag components)
  '🇫', '🇷', '🇺', '🇸', '🇬', '🇧', '🇯', '🇵', '🇪', '🇩', '🇮', '🇹',
  // Country/region flags (location context)
  '🇫🇷', '🇺🇸', '🇬🇧', '🇯🇵', '🇧🇷', '🇪🇸', '🇩🇪', '🇮🇹', '🇪🇺',
]);

/**
 * Extract all emojis from an array of text strings
 */
export function findAllEmojis(texts: string[]): string[] {
  const found: string[] = [];
  for (const text of texts) {
    const matches = text.match(EMOJI_REGEX);
    if (matches) {
      found.push(...matches);
    }
  }
  return found;
}

/**
 * Find emojis that should NOT be present (unexpected/unmigrated)
 */
export function findUnexpectedEmoji(texts: string[]): string[] {
  const allEmojis = findAllEmojis(texts);
  return allEmojis.filter((emoji) => !ALLOWED_EMOJIS.has(emoji));
}

/**
 * Extract all text content from a rendered tree
 */
export function extractAllText(container: any): string[] {
  const texts: string[] = [];

  function walk(node: any) {
    if (!node) return;

    // Check for text content
    if (typeof node === 'string') {
      texts.push(node);
      return;
    }

    if (node.children) {
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      } else {
        walk(node.children);
      }
    }

    if (node.props?.children) {
      if (Array.isArray(node.props.children)) {
        node.props.children.forEach(walk);
      } else if (typeof node.props.children === 'string') {
        texts.push(node.props.children);
      } else {
        walk(node.props.children);
      }
    }
  }

  walk(container);
  return texts;
}

export { EMOJI_REGEX, ALLOWED_EMOJIS };
