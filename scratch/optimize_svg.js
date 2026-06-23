const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'haryana.svg'), 'utf8');

// Accurate manual mapping of shape IDs to district names in DHBVN format (matching our dropdown values)
const shapeMap = {
  // DHBVN Districts
  'polygon94': 'Sirsa',
  'polygon90': 'Fatehabad',
  'polygon92': 'Hisar',
  'polygon114': 'Jind',
  'polygon96': 'Bhiwani',
  'polygon100': 'Charkhi Dadri',
  'polygon134': 'Mahendrgarh', // matches DBHVN spelling
  'polygon138': 'Rewari',
  'polygon144': 'Rewari', // Rewari has two parts
  'polygon136': 'Gurugram', // matches DHBVN spelling (Gurugram)
  'polygon110': 'Nuh',
  'polygon112': 'Palwal',
  'polygon98': 'Faridabad',
  'polygon102': 'Jhajjar',
  'polygon104': 'Rohtak',
  'polygon108': 'Sonipat',
  
  // Non-DHBVN Districts (needed for the map visual completeness, we'll label them correctly)
  'polygon132': 'Panchkula',
  'polygon122': 'Ambala',
  'polygon120': 'Yamunanagar',
  'polygon130': 'Yamunanagar',
  'polygon124': 'Kurukshetra',
  'polygon140': 'Kurukshetra',
  'polygon116': 'Kaithal',
  'polygon128': 'Karnal',
  'path106': 'Panipat'
};

const optimizedElements = [];

// Helper to clean points formatting
function cleanPoints(p) {
  return p.replace(/\s+/g, ' ').trim();
}

// 1. Extract and map polygons
const polyRegex = /<polygon([\s\S]*?)>/gi;
let match;
while ((match = polyRegex.exec(content)) !== null) {
  const body = match[1];
  const idMatch = /id="([^"]+)"/.exec(body);
  const pointsMatch = /points="([\s\S]*?)"/.exec(body);
  
  if (idMatch && pointsMatch) {
    const id = idMatch[1];
    if (shapeMap[id]) {
      const distName = shapeMap[id];
      optimizedElements.push(`  <polygon id="map-${id}" class="map-district" data-district="${distName}" points="${cleanPoints(pointsMatch[1])}" />`);
    }
  }
}

// 2. Extract and map paths (some borders or enclaves)
const pathRegex = /<path([\s\S]*?)>/gi;
while ((match = pathRegex.exec(content)) !== null) {
  const body = match[1];
  const idMatch = /id="([^"]+)"/.exec(body);
  const dMatch = /d="([\s\S]*?)"/.exec(body);
  
  if (idMatch && dMatch) {
    const id = idMatch[1];
    if (shapeMap[id]) {
      const distName = shapeMap[id];
      optimizedElements.push(`  <path id="map-${id}" class="map-district" data-district="${distName}" d="${cleanPoints(dMatch[1])}" />`);
    }
  }
}

// Create clean, lightweight SVG
const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 676 719" width="100%" height="100%">
<style>
  .map-district {
    fill: #1e293b;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1.5;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  .map-district:hover {
    fill: #334155;
    stroke: #06b6d4;
    stroke-width: 2;
  }
  .map-district.selected {
    stroke: #06b6d4;
    stroke-width: 2.5;
  }
  .map-district.level-clear {
    fill: rgba(16, 185, 129, 0.25);
    stroke: rgba(16, 185, 129, 0.5);
  }
  .map-district.level-clear:hover {
    fill: rgba(16, 185, 129, 0.4);
  }
  .map-district.level-minor {
    fill: rgba(245, 158, 11, 0.25);
    stroke: rgba(245, 158, 11, 0.5);
  }
  .map-district.level-minor:hover {
    fill: rgba(245, 158, 11, 0.4);
  }
  .map-district.level-major {
    fill: rgba(244, 63, 94, 0.25);
    stroke: rgba(244, 63, 94, 0.5);
  }
  .map-district.level-major:hover {
    fill: rgba(244, 63, 94, 0.4);
  }
</style>
<g id="haryana-districts">`;

const svgFooter = `</g>\n</svg>`;

const finalSvg = `${svgHeader}\n${optimizedElements.join('\n')}\n${svgFooter}`;

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const outputPath = path.join(assetsDir, 'haryana_districts.svg');
fs.writeFileSync(outputPath, finalSvg);
console.log(`Optimized SVG compiled successfully: ${outputPath} (${optimizedElements.length} elements included)`);
