import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current directory:', __dirname);
console.log('Current working directory:', process.cwd());
console.log('Environment variables:', JSON.stringify(process.env, null, 2));

// Try to build the project if we're in the Render environment
if (process.env.RENDER) {
  try {
    console.log('Attempting to build the project on Render...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Error building the project:', error.message);
  }
}

// List all directories in the current path
try {
  console.log('Files in current directory:', readdirSync(__dirname));
  console.log('Files in current working directory:', readdirSync(process.cwd()));
} catch (error) {
  console.error('Error listing files:', error.message);
}

// Determine the correct dist path
let distPath = join(__dirname, 'dist');
console.log('Initial dist path:', distPath, 'exists:', existsSync(distPath));

// Check if we're in the Render environment
if (!existsSync(distPath)) {
  // Try alternative paths that might exist in the Render environment
  const possiblePaths = [
    '/opt/render/project/src/dist',
    resolve(__dirname, '../dist'),
    resolve(__dirname, './dist'),
    resolve(process.cwd(), 'dist'),
    '/opt/render/project/dist'
  ];
  
  console.log('Checking possible dist paths...');
  for (const path of possiblePaths) {
    console.log(`Checking path: ${path}, exists: ${existsSync(path)}`);
    if (existsSync(path)) {
      distPath = path;
      console.log(`Found dist directory at: ${distPath}`);
      try {
        console.log('Contents of dist directory:', readdirSync(distPath));
      } catch (error) {
        console.error(`Error listing files in ${distPath}:`, error.message);
      }
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

// Create a fallback HTML page if dist directory is not found
const createFallbackPage = () => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mighty Truck Adventure</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f0f0f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          text-align: center;
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        p {
          color: #666;
          max-width: 600px;
          line-height: 1.6;
        }
        .truck {
          font-size: 100px;
          margin-bottom: 20px;
        }
        .button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        }
        .button:hover {
          background-color: #45a049;
        }
      </style>
    </head>
    <body>
      <div class="truck">🚚</div>
      <h1>Mighty Truck Adventure</h1>
      <p>The game is currently being built. Please check back in a few minutes!</p>
      <p>If this message persists, please contact support.</p>
      <button class="button" onclick="window.location.reload()">Refresh Page</button>
    </body>
    </html>
  `;
};

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`Index file not found at ${indexPath}. Available files in dist: ${existsSync(distPath) ? JSON.stringify(readdirSync(distPath)) : 'dist directory not found'}`);
    
    // Send a nicer fallback page
    res.status(200).send(createFallbackPage());
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 