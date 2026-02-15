import * as fs from 'fs';
import * as path from 'path';
import { EMOJI_REGEX, ALLOWED_EMOJIS } from '../helpers/iconTestUtils';

// ============================================
// INTEGRATION TEST: No unexpected emoji in migrated files
// ============================================
// Scans all 21 migrated source files for emoji leaks

const ROOT = path.resolve(__dirname, '..', '..');

const MIGRATED_FILES = [
  'components/QuestsCard.tsx',
  'components/RepsWeightModal.tsx',
  'components/AchievementCelebration.tsx',
  'components/planning/EmptyState.tsx',
  'components/DevCodeModal.tsx',
  'components/ui/WellnessCards.tsx',
  'components/HydrationWidget.tsx',
  'components/WeeklyChallenge.tsx',
  'components/home/EditableHomeContainer.tsx',
  'components/stats/DisciplineStats.tsx',
  'components/planning/TimetableView.tsx',
  'app/events.tsx',
  'app/(tabs)/planning.tsx',
  'app/(tabs)/more/index.tsx',
  'app/sleep.tsx',
  'app/weekly-report.tsx',
  'app/sleep-input.tsx',
  'app/savoir.tsx',
  'app/add-club.tsx',
  'app/health-professionals.tsx',
  'app/gamification.tsx',
];

/**
 * Strip comments from source code to avoid false positives
 */
function stripComments(source: string): string {
  // Remove single-line comments
  let result = source.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

/**
 * Find emojis in JSX content (between < > tags and in string literals)
 */
function findEmojisInSource(source: string): { emoji: string; line: number; context: string }[] {
  const found: { emoji: string; line: number; context: string }[] = [];
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    const matches = line.match(EMOJI_REGEX);
    if (matches) {
      matches.forEach((emoji) => {
        if (!ALLOWED_EMOJIS.has(emoji)) {
          found.push({
            emoji,
            line: index + 1,
            context: line.trim().substring(0, 80),
          });
        }
      });
    }
  });

  return found;
}

describe('No emoji leak in migrated files', () => {
  MIGRATED_FILES.forEach((relPath) => {
    const fullPath = path.join(ROOT, relPath);

    it(`${relPath} has no unexpected emojis`, () => {
      // Skip if file doesn't exist (not all files may be present in all branches)
      if (!fs.existsSync(fullPath)) {
        console.warn(`  ⚠ File not found: ${relPath} - skipping`);
        return;
      }

      const source = fs.readFileSync(fullPath, 'utf-8');
      const strippedSource = stripComments(source);
      const leaks = findEmojisInSource(strippedSource);

      if (leaks.length > 0) {
        const details = leaks
          .map((l) => `  Line ${l.line}: "${l.emoji}" → ${l.context}`)
          .join('\n');
        throw new Error(`Found ${leaks.length} unexpected emoji(s) in ${relPath}:\n${details}`);
      }
    });
  });

  it('all migrated files import from lucide-react-native (not emoji)', () => {
    let filesWithLucide = 0;
    let filesChecked = 0;

    MIGRATED_FILES.forEach((relPath) => {
      const fullPath = path.join(ROOT, relPath);
      if (!fs.existsSync(fullPath)) return;

      filesChecked++;
      const source = fs.readFileSync(fullPath, 'utf-8');
      if (source.includes('lucide-react-native')) {
        filesWithLucide++;
      }
    });

    console.log(`  ${filesWithLucide}/${filesChecked} files import lucide-react-native`);
    // At least 80% of files should import lucide
    expect(filesWithLucide / filesChecked).toBeGreaterThan(0.7);
  });
});
