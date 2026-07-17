const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(dist, 'index.html');
const notFound = path.join(dist, '404.html');

if (!fs.existsSync(indexHtml)) {
  console.error('dist/index.html missing — run npm run predeploy first');
  process.exit(1);
}

fs.copyFileSync(indexHtml, notFound);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('prepared dist/404.html and dist/.nojekyll for GitHub Pages SPA');
