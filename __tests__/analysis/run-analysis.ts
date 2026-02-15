#!/usr/bin/env ts-node
// ============================================
// STATIC ANALYSIS: Lucide icon usage & emoji scan
// ============================================
// Scans all .tsx files for lucide imports and remaining emojis

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(__dirname, 'report.json');

// Emoji regex (same as in iconTestUtils.ts)
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{20E3}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;

const ALLOWED_EMOJIS = new Set([
  '🎁', '💧', '🔐', '🔒', '🔓', '🔥', '💤', '💡', '🌍', '🌙',
  '🗓', '🗓️', '📋', '📖', '📅', '🔄', '🔆', '🖱', '🖱️',
  '🇫🇷', '🇺🇸', '🇬🇧', '🇯🇵', '🇧🇷', '🇪🇸', '🇩🇪', '🇮🇹', '🇪🇺',
]);

interface FileAnalysis {
  file: string;
  hasLucideImport: boolean;
  lucideIcons: string[];
  emojisFound: { emoji: string; line: number; allowed: boolean }[];
  isClean: boolean;
}

interface Report {
  timestamp: string;
  totalFiles: number;
  filesWithLucide: number;
  cleanFiles: number;
  filesWithEmoji: number;
  topIcons: { icon: string; count: number }[];
  files: FileAnalysis[];
  filesWithUnexpectedEmojis: string[];
}

/**
 * Recursively find all .tsx files in a directory
 */
function findTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract Lucide icon names from import statements
 */
function extractLucideImports(source: string): string[] {
  const regex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react-native['"]/g;
  const icons: string[] = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const names = match[1].split(',').map((n) => n.trim()).filter(Boolean);
    icons.push(...names);
  }
  return icons;
}

/**
 * Find all emojis in source
 */
function findEmojis(source: string): { emoji: string; line: number; allowed: boolean }[] {
  const found: { emoji: string; line: number; allowed: boolean }[] = [];
  const lines = source.split('\n');
  lines.forEach((line, idx) => {
    // Skip comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    const matches = line.match(EMOJI_REGEX);
    if (matches) {
      matches.forEach((emoji) => {
        found.push({
          emoji,
          line: idx + 1,
          allowed: ALLOWED_EMOJIS.has(emoji),
        });
      });
    }
  });
  return found;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath: string): FileAnalysis {
  const source = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(ROOT, filePath);
  const lucideIcons = extractLucideImports(source);
  const emojisFound = findEmojis(source);
  const unexpectedEmojis = emojisFound.filter((e) => !e.allowed);

  return {
    file: relPath,
    hasLucideImport: lucideIcons.length > 0,
    lucideIcons,
    emojisFound,
    isClean: unexpectedEmojis.length === 0,
  };
}

// ============================================
// MAIN
// ============================================
function main() {
  console.log('🔍 Scanning codebase for Lucide icons and emojis...\n');

  const dirs = [
    path.join(ROOT, 'components'),
    path.join(ROOT, 'app'),
  ];

  const allFiles = dirs.flatMap(findTsxFiles);
  const analyses = allFiles.map(analyzeFile);

  // Count icons usage
  const iconCounts = new Map<string, number>();
  analyses.forEach((a) => {
    a.lucideIcons.forEach((icon) => {
      iconCounts.set(icon, (iconCounts.get(icon) || 0) + 1);
    });
  });

  const topIcons = Array.from(iconCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([icon, count]) => ({ icon, count }));

  const filesWithLucide = analyses.filter((a) => a.hasLucideImport);
  const cleanFiles = analyses.filter((a) => a.isClean);
  const filesWithUnexpectedEmojis = analyses
    .filter((a) => !a.isClean)
    .map((a) => a.file);

  const report: Report = {
    timestamp: new Date().toISOString(),
    totalFiles: analyses.length,
    filesWithLucide: filesWithLucide.length,
    cleanFiles: cleanFiles.length,
    filesWithEmoji: filesWithUnexpectedEmojis.length,
    topIcons,
    files: analyses.filter((a) => a.hasLucideImport || a.emojisFound.length > 0),
    filesWithUnexpectedEmojis,
  };

  // Console output
  console.log('========== MIGRATION ANALYSIS REPORT ==========');
  console.log(`Total .tsx files scanned:     ${report.totalFiles}`);
  console.log(`Files with Lucide imports:    ${report.filesWithLucide}`);
  console.log(`Clean files (no bad emoji):   ${report.cleanFiles}`);
  console.log(`Files with unexpected emoji:  ${report.filesWithEmoji}`);
  console.log('');

  console.log('Top 20 Lucide icons used:');
  topIcons.forEach(({ icon, count }, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${icon.padEnd(20)} (${count}x)`);
  });
  console.log('');

  if (filesWithUnexpectedEmojis.length > 0) {
    console.log('⚠️  Files with unexpected emojis:');
    filesWithUnexpectedEmojis.forEach((f) => {
      const analysis = analyses.find((a) => a.file === f)!;
      const unexpected = analysis.emojisFound.filter((e) => !e.allowed);
      unexpected.forEach((e) => {
        console.log(`  ${f}:${e.line} → ${e.emoji}`);
      });
    });
  } else {
    console.log('✅ All files are clean! No unexpected emojis found.');
  }

  console.log('================================================\n');

  // Save JSON report
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${OUTPUT_PATH}`);
}

main();
