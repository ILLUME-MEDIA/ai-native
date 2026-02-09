const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'resources', 'js', 'Admin');

function walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(f.name)) {
      let content = fs.readFileSync(full, 'utf8');
      const replaced = content.replace(/("|')@\//g, `$1@admin/`);
      if (replaced !== content) {
        fs.writeFileSync(full, replaced, 'utf8');
        console.log('Updated', full);
      }
    }
  }
}

walk(dir);
console.log('Done');