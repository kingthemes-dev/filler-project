#!/usr/bin/env node

/**
 * Build Report Generator for Next.js
 * Analyzes build output and generates comprehensive build reports
 *
 * Usage:
 *   node scripts/generate-build-report.mjs
 *   npm run build:report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const APP_DIR = path.resolve(__dirname, '..');
const NEXT_DIR = path.join(APP_DIR, '.next');
const ROOT_DIR = path.resolve(APP_DIR, '../..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const BUILD_REPORT_MD = path.join(DOCS_DIR, 'BUILD_REPORT.md');
const BUILD_REPORT_JSON = path.join(APP_DIR, 'build-report.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += getFileSize(filePath);
      }
    }
  } catch (error) {
    // Directory might not exist
  }
  return totalSize;
}

function getAllFiles(dirPath, fileList = []) {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else {
        fileList.push({
          path: filePath,
          relativePath: path.relative(NEXT_DIR, filePath),
          size: getFileSize(filePath),
        });
      }
    }
  } catch (error) {
    // Directory might not exist
  }
  return fileList;
}

// Build analyzer class
class BuildAnalyzer {
  constructor() {
    this.buildId = null;
    this.routesManifest = null;
    this.buildManifest = null;
    this.staticFiles = [];
    this.serverFiles = [];
    this.errors = [];
    this.warnings = [];
  }

  // Check if .next directory exists
  checkBuildExists() {
    if (!fs.existsSync(NEXT_DIR)) {
      throw new Error(
        `Build directory not found: ${NEXT_DIR}\nPlease run 'npm run build' first.`
      );
    }
    return true;
  }

  // Read BUILD_ID
  readBuildId() {
    const buildIdPath = path.join(NEXT_DIR, 'BUILD_ID');
    try {
      if (fs.existsSync(buildIdPath)) {
        this.buildId = fs.readFileSync(buildIdPath, 'utf-8').trim();
      }
    } catch (error) {
      this.warnings.push(`Could not read BUILD_ID: ${error.message}`);
    }
  }

  // Read routes-manifest.json
  readRoutesManifest() {
    const routesManifestPath = path.join(NEXT_DIR, 'routes-manifest.json');
    try {
      if (fs.existsSync(routesManifestPath)) {
        const content = fs.readFileSync(routesManifestPath, 'utf-8');
        this.routesManifest = JSON.parse(content);
      }
    } catch (error) {
      this.warnings.push(`Could not read routes-manifest.json: ${error.message}`);
    }
  }

  // Read build-manifest.json
  readBuildManifest() {
    const buildManifestPath = path.join(NEXT_DIR, 'build-manifest.json');
    try {
      if (fs.existsSync(buildManifestPath)) {
        const content = fs.readFileSync(buildManifestPath, 'utf-8');
        this.buildManifest = JSON.parse(content);
      }
    } catch (error) {
      this.warnings.push(`Could not read build-manifest.json: ${error.message}`);
    }
  }

  // Analyze static files
  analyzeStaticFiles() {
    const staticDir = path.join(NEXT_DIR, 'static');
    if (fs.existsSync(staticDir)) {
      this.staticFiles = getAllFiles(staticDir);
    }
  }

  // Analyze server files
  analyzeServerFiles() {
    const serverDir = path.join(NEXT_DIR, 'server');
    if (fs.existsSync(serverDir)) {
      this.serverFiles = getAllFiles(serverDir);
    }
  }

  // Analyze chunks from build manifest
  analyzeChunks() {
    const chunks = [];
    if (this.buildManifest?.pages) {
      for (const [page, files] of Object.entries(this.buildManifest.pages)) {
        let pageSize = 0;
        const pageChunks = [];

        for (const file of files) {
          const filePath = path.join(NEXT_DIR, file);
          const size = getFileSize(filePath);
          pageSize += size;
          pageChunks.push({
            file,
            size,
            formattedSize: formatBytes(size),
          });
        }

        chunks.push({
          page,
          totalSize: pageSize,
          formattedSize: formatBytes(pageSize),
          chunks: pageChunks,
        });
      }
    }
    return chunks.sort((a, b) => b.totalSize - a.totalSize);
  }

  // Analyze routes
  analyzeRoutes() {
    const routes = {
      static: [],
      dynamic: [],
      ssr: [],
      isr: [],
      api: [],
    };

    if (this.routesManifest) {
      // Static routes
      if (this.routesManifest.staticRoutes) {
        routes.static = this.routesManifest.staticRoutes.map((r) => ({
          page: r.page,
          regex: r.regex,
          type: 'static',
        }));
      }

      // Dynamic routes
      if (this.routesManifest.dynamicRoutes) {
        routes.dynamic = this.routesManifest.dynamicRoutes.map((r) => ({
          page: r.page,
          regex: r.regex,
          type: 'dynamic',
        }));
      }
    }

    // Analyze server files to detect SSR/ISR
    const serverPages = path.join(NEXT_DIR, 'server', 'app');
    if (fs.existsSync(serverPages)) {
      this.analyzeServerPages(serverPages, routes);
    }

    // Detect API routes
    const apiDir = path.join(serverPages, 'api');
    if (fs.existsSync(apiDir)) {
      routes.api = this.findApiRoutes(apiDir);
    }

    return routes;
  }

  // Analyze server pages for SSR/ISR
  analyzeServerPages(serverPagesDir, routes) {
    try {
      const files = fs.readdirSync(serverPagesDir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(serverPagesDir, file.name);
        if (file.isDirectory() && file.name !== 'api') {
          // Check for route.js/ts files
          const routeFile = fs
            .readdirSync(filePath)
            .find((f) => f.match(/^route\.(js|ts|jsx|tsx)$/));
          if (routeFile) {
            routes.api.push({
              path: `/${file.name}`,
              type: 'api',
            });
          } else {
            // Check for page files
            const pageFile = fs
              .readdirSync(filePath)
              .find((f) => f.match(/^page\.(js|ts|jsx|tsx)$/));
            if (pageFile) {
              const pageContent = fs.readFileSync(
                path.join(filePath, pageFile),
                'utf-8'
              );
              if (pageContent.includes('revalidate')) {
                routes.isr.push({
                  path: `/${file.name}`,
                  type: 'isr',
                });
              } else {
                routes.ssr.push({
                  path: `/${file.name}`,
                  type: 'ssr',
                });
              }
            }
          }
        }
      }
    } catch (error) {
      this.warnings.push(`Could not analyze server pages: ${error.message}`);
    }
  }

  // Find API routes
  findApiRoutes(apiDir) {
    const apiRoutes = [];
    try {
      const files = fs.readdirSync(apiDir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(apiDir, file.name);
        if (file.isDirectory()) {
          const routeFile = fs
            .readdirSync(filePath)
            .find((f) => f.match(/^route\.(js|ts|jsx|tsx)$/));
          if (routeFile) {
            apiRoutes.push({
              path: `/api/${file.name}`,
              type: 'api',
            });
          }
        }
      }
    } catch (error) {
      // API directory might not exist
    }
    return apiRoutes;
  }

  // Calculate total sizes
  calculateSizes() {
    const staticSize = this.staticFiles.reduce((sum, f) => sum + f.size, 0);
    const serverSize = this.serverFiles.reduce((sum, f) => sum + f.size, 0);
    const totalSize = staticSize + serverSize;

    return {
      static: staticSize,
      server: serverSize,
      total: totalSize,
      formatted: {
        static: formatBytes(staticSize),
        server: formatBytes(serverSize),
        total: formatBytes(totalSize),
      },
    };
  }

  // Get largest chunks
  getLargestChunks(limit = 10) {
    const allChunks = [];
    this.staticFiles.forEach((file) => {
      if (file.size > 0) {
        allChunks.push({
          name: file.relativePath,
          size: file.size,
          formattedSize: formatBytes(file.size),
        });
      }
    });
    return allChunks.sort((a, b) => b.size - a.size).slice(0, limit);
  }


  // Run full analysis
  analyze() {
    log('\n🔍 Analizowanie builda Next.js...', 'cyan');

    this.checkBuildExists();
    this.readBuildId();
    this.readRoutesManifest();
    this.readBuildManifest();
    this.analyzeStaticFiles();
    this.analyzeServerFiles();

    const chunks = this.analyzeChunks();
    const routes = this.analyzeRoutes();
    const sizes = this.calculateSizes();
    const largestChunks = this.getLargestChunks(10);

    return {
      buildId: this.buildId,
      timestamp: new Date().toISOString(),
      chunks,
      routes,
      sizes,
      largestChunks,
      staticFiles: this.staticFiles,
      serverFiles: this.serverFiles,
      warnings: this.warnings,
      errors: this.errors,
    };
  }
}

// Generate optimization suggestions
function generateSuggestions(data) {
  const suggestions = [];

  // Check for large bundles
  const largeChunks = data.largestChunks.filter((c) => c.size > 500 * 1024); // > 500KB
  if (largeChunks.length > 0) {
    suggestions.push({
      type: 'warning',
      message: `Znaleziono ${largeChunks.length} duże chunk'i (>500KB). Rozważ code splitting.`,
      chunks: largeChunks.map((c) => c.name),
    });
  }

  // Check total bundle size
  if (data.sizes.total > 10 * 1024 * 1024) {
    // > 10MB
    suggestions.push({
      type: 'warning',
      message: `Całkowity rozmiar builda (${data.sizes.formatted.total}) jest duży. Rozważ optymalizację.`,
    });
  }

  // Check for many dynamic routes
  const totalRoutes =
    data.routes.static.length +
    data.routes.dynamic.length +
    data.routes.ssr.length +
    data.routes.isr.length;
  if (totalRoutes > 0 && data.routes.dynamic.length > totalRoutes * 0.5) {
    suggestions.push({
      type: 'info',
      message: `Większość tras jest dynamiczna (${data.routes.dynamic.length}/${totalRoutes}). Rozważ statyczne generowanie gdzie to możliwe.`,
    });
  }

  // Check static files
  if (data.sizes.static > 5 * 1024 * 1024) {
    // > 5MB
    suggestions.push({
      type: 'info',
      message: `Duży rozmiar plików statycznych (${data.sizes.formatted.static}). Rozważ optymalizację obrazów i assetów.`,
    });
  }

  return suggestions;
}

// Report generator
class ReportGenerator {
  constructor(data) {
    this.data = data;
  }

  generateMarkdown() {
    const { data } = this;
    const routes = data.routes;
    const totalRoutes =
      routes.static.length +
      routes.dynamic.length +
      routes.ssr.length +
      routes.isr.length +
      routes.api.length;

    let markdown = `# Raport Builda Next.js

**Data generacji**: ${new Date(data.timestamp).toLocaleString('pl-PL')}  
**Build ID**: ${data.buildId || 'N/A'}  
**Status**: ${data.errors.length === 0 ? '✅ Sukces' : '❌ Błędy'}

---

## Executive Summary

Build zakończony ${data.errors.length === 0 ? 'pomyślnie' : 'z błędami'}.

### Kluczowe Metryki

- **Całkowity rozmiar**: ${data.sizes.formatted.total}
- **Pliki statyczne**: ${data.sizes.formatted.static}
- **Pliki serwerowe**: ${data.sizes.formatted.server}
- **Liczba tras**: ${totalRoutes}
- **Liczba chunków**: ${data.chunks.length}

---

## Build Metrics

### Rozmiary

| Typ | Rozmiar |
|-----|---------|
| **Całkowity** | ${data.sizes.formatted.total} |
| Pliki statyczne | ${data.sizes.formatted.static} |
| Pliki serwerowe | ${data.sizes.formatted.server} |

### Trasy

| Typ | Liczba |
|-----|--------|
| **Statyczne (SSG)** | ${routes.static.length} |
| **Dynamiczne** | ${routes.dynamic.length} |
| **SSR** | ${routes.ssr.length} |
| **ISR** | ${routes.isr.length} |
| **API** | ${routes.api.length} |
| **Razem** | ${totalRoutes} |

---

## Bundle Analysis

### Największe Chunk'i

| Plik | Rozmiar |
|------|---------|
${data.largestChunks
  .map((chunk) => `| \`${chunk.name}\` | ${chunk.formattedSize} |`)
  .join('\n')}

### Analiza Chunków per Strona

${data.chunks.length > 0 ? data.chunks.slice(0, 20).map(chunk => `
#### ${chunk.page}

- **Całkowity rozmiar**: ${chunk.formattedSize}
- **Liczba plików**: ${chunk.chunks.length}

${chunk.chunks.length > 0 ? `Pliki:\n${chunk.chunks.map(c => `- \`${c.file}\` (${c.formattedSize})`).join('\n')}` : ''}
`).join('\n') : 'Brak danych o chunkach'}

---

## Routes Breakdown

### Statyczne Trasy (SSG)

${routes.static.length > 0 ? routes.static.map(r => `- \`${r.page}\``).join('\n') : '*Brak statycznych tras*'}

### Dynamiczne Trasy

${routes.dynamic.length > 0 ? routes.dynamic.map(r => `- \`${r.page}\` (regex: \`${r.regex}\`)`).join('\n') : '*Brak dynamicznych tras*'}

### SSR Trasy

${routes.ssr.length > 0 ? routes.ssr.map(r => `- \`${r.path}\``).join('\n') : '*Brak SSR tras*'}

### ISR Trasy

${routes.isr.length > 0 ? routes.isr.map(r => `- \`${r.path}\``).join('\n') : '*Brak ISR tras*'}

### API Endpoints

${routes.api.length > 0 ? routes.api.map(r => `- \`${r.path}\``).join('\n') : '*Brak API endpoints*'}

---

## Warnings & Errors

${data.warnings.length > 0 ? `### Ostrzeżenia\n\n${data.warnings.map(w => `- ⚠️ ${w}`).join('\n')}\n\n` : '### Ostrzeżenia\n\n*Brak ostrzeżeń*\n\n'}

${data.errors.length > 0 ? `### Błędy\n\n${data.errors.map(e => `- ❌ ${e}`).join('\n')}\n\n` : '### Błędy\n\n*Brak błędów*\n\n'}

---

## Optimization Suggestions

${(() => {
  const suggestions = generateSuggestions(data);
  if (suggestions.length === 0) {
    return '*Brak sugestii optymalizacji*';
  }
  return suggestions.map(s => {
    const icon = s.type === 'warning' ? '⚠️' : 'ℹ️';
    return `- ${icon} **${s.type === 'warning' ? 'Ostrzeżenie' : 'Informacja'}**: ${s.message}${s.chunks ? `\n  - Dotyczy: ${s.chunks.join(', ')}` : ''}`;
  }).join('\n');
})()}

---

## Szczegóły Techniczne

### Struktura Builda

- **Build ID**: \`${data.buildId || 'N/A'}\`
- **Timestamp**: ${data.timestamp}
- **Liczba plików statycznych**: ${data.staticFiles?.length || 0}
- **Liczba plików serwerowych**: ${data.serverFiles?.length || 0}

---

*Raport wygenerowany automatycznie przez \`generate-build-report.mjs\`*
`;

    return markdown;
  }

  save() {
    // Ensure docs directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    // Generate and save markdown report
    const markdown = this.generateMarkdown();
    fs.writeFileSync(BUILD_REPORT_MD, markdown, 'utf-8');
    log(`\n📄 Raport markdown zapisany: ${BUILD_REPORT_MD}`, 'green');

    // Save JSON data for comparison
    fs.writeFileSync(
      BUILD_REPORT_JSON,
      JSON.stringify(this.data, null, 2),
      'utf-8'
    );
    log(`📊 Dane JSON zapisane: ${BUILD_REPORT_JSON}`, 'green');
  }
}

// Main function
async function main() {
  try {
    log('📦 Generator Raportu Builda Next.js', 'bright');
    log('='.repeat(60), 'reset');

    const analyzer = new BuildAnalyzer();
    const data = analyzer.analyze();

    log('\n✅ Analiza zakończona', 'green');
    log(`   Build ID: ${data.buildId || 'N/A'}`, 'cyan');
    log(`   Rozmiar: ${data.sizes.formatted.total}`, 'cyan');
    log(
      `   Trasy: ${data.routes.static.length + data.routes.dynamic.length + data.routes.ssr.length + data.routes.isr.length + data.routes.api.length}`,
      'cyan'
    );

    const generator = new ReportGenerator(data);
    generator.save();

    log('\n✅ Raport wygenerowany pomyślnie!', 'green');
  } catch (error) {
    log(`\n❌ Błąd: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly (check if this file is being executed)
const isMainModule = process.argv[1] && 
  (process.argv[1].endsWith('generate-build-report.mjs') || 
   import.meta.url.includes('generate-build-report.mjs'));
if (isMainModule) {
  main();
}

export { BuildAnalyzer, ReportGenerator };

