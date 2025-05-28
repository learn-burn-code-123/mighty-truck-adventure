import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the correct dist path
let distPath = join(__dirname, 'dist');

// Check if we're in the Render environment
if (process.env.RENDER && !existsSync(distPath)) {
  // Try alternative paths that might exist in the Render environment
  const possiblePaths = [
    '/opt/render/project/src/dist',
    resolve(__dirname, '../dist'),
    resolve(__dirname, './dist')
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      distPath = path;
      console.log(`Found dist directory at: ${distPath}`);
      break;
    }
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Enable compression
app.use(compression());

// Serve static files from the dist directory
app.use(express.static(distPath));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`Index file not found at ${indexPath}. Available files in dist: ${existsSync(distPath) ? JSON.stringify(require('fs').readdirSync(distPath)) : 'dist directory not found'}`);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 