import { defineConfig } from 'vite'
import { resolve } from 'path'
import { writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html')
      }
    }
  },
  plugins: [
    {
      name: 'generate-chrome-extension-files',
      closeBundle() {
        // Ensure the dist/src directory exists
        const srcDir = resolve(__dirname, 'dist/src');
        if (!existsSync(srcDir)) {
          mkdirSync(srcDir, { recursive: true });
        }
        
        // Copy the manifest.json file
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
        
        // Copy the content script and helpers (helpers first)
        copyFileSync(resolve(__dirname, 'src/helpers.js'), resolve(__dirname, 'dist/src/helpers.js'));
        copyFileSync(resolve(__dirname, 'src/contentScript.js'), resolve(__dirname, 'dist/src/contentScript.js'));
        copyFileSync(resolve(__dirname, 'src/sidepanel.js'), resolve(__dirname, 'dist/src/sidepanel.js'));
        
        // Copy background.js from root directory instead of generating it
        copyFileSync(resolve(__dirname, 'background.js'), resolve(__dirname, 'dist/background.js'));
        
        // Create assets directory and copy icons
        const assetsDir = resolve(__dirname, 'dist/src/assets');
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir, { recursive: true });
        }
        
        // Copy icon files if they exist
        const iconFiles = ['discord_16.png', 'discord_48.png', 'discord_128.png', 'discord_icon.png'];
        iconFiles.forEach(icon => {
          const iconPath = resolve(__dirname, `src/assets/${icon}`);
          if (existsSync(iconPath)) {
            copyFileSync(
              iconPath, 
              resolve(__dirname, `dist/src/assets/${icon}`)
            );
          }
        });
        
        console.log('Chrome Extension build completed successfully!');
      }
    }
  ]
})
