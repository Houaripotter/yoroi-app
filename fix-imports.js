const fs = require('fs');
const { execSync } = require('child_process');

// Trouver tous les fichiers TS/TSX
const files = execSync(
  'find . -type f \\( -name "*.tsx" -o -name "*.ts" \\) -not -path "./node_modules/*"',
  { encoding: 'utf-8' }
)
  .split('\n')
  .filter(Boolean);

let fixedCount = 0;

files.forEach((file) => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    const originalContent = content;

    // Pattern à corriger: import { \nimport logger (avec espace optionnel)
    // Remplacer le pattern
    content = content.replace(
      /import \{\s*\nimport logger from '@\/lib\/security\/logger';/g,
      'import logger from \'@/lib/security/logger\';\nimport {'
    );

    // Sauvegarder seulement si modifié
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files!`);
