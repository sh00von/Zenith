// agents/AnswerAgent.js
import { tracer } from '../utils/tracer.js';

/* ---------- Few‐Shot Demonstrations ---------- */
const FEW_SHOT = `### EXAMPLE 1: Geospatial Analysis
<user>
How can I analyze urban heat island effects using Landsat thermal data?
</user>
<assistant>
### QUESTION
How can I analyze urban heat island effects using Landsat thermal data?

### BACKGROUND
Urban Heat Island (UHI) effect occurs when urban areas experience higher temperatures than surrounding rural areas due to human activities and infrastructure.

### FACTS
- Landsat 8 TIRS band 10 provides thermal data at 100m resolution
- Surface temperature can be derived using the Radiative Transfer Equation
- Urban areas typically show 2-5°C higher temperatures than rural areas

### PLAN
1. Load Landsat 8 collection for summer months
2. Calculate surface temperature from thermal band
3. Mask clouds and water bodies
4. Compare urban vs rural temperature differences
5. Create visualization with temperature gradient

### CODE
\`\`\`js
// Load Landsat 8 collection
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
           .filterDate('2023-06-01', '2023-08-31')
           .filterBounds(geometry);

// Calculate surface temperature
var thermal = l8.select('B10').mean();
var temp = thermal.multiply(0.00341802).add(149.0);

// Mask water and clouds
var water = ee.Image('JRC/GSW1_0/GlobalSurfaceWater').select('occurrence');
var tempMasked = temp.updateMask(water.lt(10));

// Visualize
Map.addLayer(tempMasked, {
  min: 20, max: 40,
  palette: ['blue', 'yellow', 'red']
}, 'Surface Temperature');
\`\`\`

### EXAMPLE 2: GIS Analysis
<user>
What's the best way to calculate watershed boundaries from DEM data?
</user>
<assistant>
### QUESTION
What's the best way to calculate watershed boundaries from DEM data?

### BACKGROUND
Watershed delineation is a fundamental GIS operation that identifies drainage areas based on digital elevation models (DEMs).

### FACTS
- SRTM and ASTER GDEM provide global DEM coverage
- Flow accumulation and direction are key calculations
- Pour points define watershed outlets

### PLAN
1. Load high-resolution DEM data
2. Fill sinks and calculate flow direction
3. Compute flow accumulation
4. Define pour points
5. Delineate watershed boundaries

### CODE
\`\`\`js
// Load SRTM DEM
var dem = ee.Image('USGS/SRTMGL1_003');

// Fill sinks
var filled = dem.fill(100);

// Calculate flow direction
var flowDir = filled.flowDirection();

// Compute flow accumulation
var flowAcc = flowDir.accumulation();

// Define pour point
var pourPoint = ee.Geometry.Point([-122.4194, 37.7749]);

// Delineate watershed
var watershed = flowAcc.watershed({
  seed: pourPoint,
  threshold: 1000
});

Map.addLayer(watershed, {palette: ['blue']}, 'Watershed');
\`\`\`

### EXAMPLE 3: Remote Sensing
<user>
How do I perform change detection between two Sentinel-2 images?
</assistant>
### QUESTION
How do I perform change detection between two Sentinel-2 images?

### BACKGROUND
Change detection in remote sensing involves comparing images from different time periods to identify significant changes in land cover or use.

### FACTS
- Sentinel-2 provides 10m resolution multispectral data
- NDVI is effective for vegetation change detection
- Atmospheric correction is crucial for accurate comparison

### PLAN
1. Load Sentinel-2 collections for both time periods
2. Apply atmospheric correction
3. Calculate NDVI for both images
4. Compute difference and threshold
5. Visualize changes

### CODE
\`\`\`js
// Load Sentinel-2 collections
var s2_2022 = ee.ImageCollection('COPERNICUS/S2_SR')
                .filterDate('2022-01-01', '2022-12-31')
                .median();
var s2_2023 = ee.ImageCollection('COPERNICUS/S2_SR')
                .filterDate('2023-01-01', '2023-12-31')
                .median();

// Calculate NDVI
var ndvi_2022 = s2_2022.normalizedDifference(['B8', 'B4']);
var ndvi_2023 = s2_2023.normalizedDifference(['B8', 'B4']);

// Compute change
var change = ndvi_2023.subtract(ndvi_2022);
var significantChange = change.abs().gt(0.2);

Map.addLayer(significantChange, {
  palette: ['white', 'red']
}, 'Significant Changes');
\`\`\`
</assistant>
`;

/* ---------- AnswerAgent Class ---------- */
export class AnswerAgent {
  constructor(model) {
    this.model = model;  // raw Gemini model
    this.popularDatasets = [
      // Satellite Imagery
      'LANDSAT/LC08/C02/T1_L2',    // Landsat 8
      'LANDSAT/LE07/C02/T1_L2',    // Landsat 7
      'LANDSAT/LT05/C02/T1_L2',    // Landsat 5
      'COPERNICUS/S2_SR',          // Sentinel-2
      'COPERNICUS/S1_GRD',         // Sentinel-1
      'MODIS/006/MOD13Q1',         // MODIS NDVI
      'MODIS/006/MOD11A1',         // MODIS LST
      'MODIS/006/MCD12Q1',         // MODIS Land Cover
      
      // Administrative Boundaries
      'FAO/GAUL/2015/level0',      // FAO GAUL Country Level
      'FAO/GAUL/2015/level1',      // FAO GAUL First Level
      'FAO/GAUL/2015/level2',      // FAO GAUL Second Level
      
      // Elevation & Terrain
      'USGS/SRTMGL1_003',          // SRTM DEM
      'USGS/NED',                  // National Elevation Dataset
      'COPERNICUS/DEM/GLO30',      // Copernicus 30m DEM
      'WWF/HydroSHEDS/03CONDEM',   // HydroSHEDS
      
      // Land Cover & Land Use
      'USGS/NLCD',                 // National Land Cover
      'ESA/WorldCover/v100',       // ESA WorldCover
      'COPERNICUS/Landcover/100m/Proba-V-C3/Global', // Copernicus Land Cover
      'USGS/GAP/CONUS/2011',       // GAP Analysis
      
      // Agriculture & Food Security
      'USGS/GFSAD1000_V1',         // Global Food Security 1km
      'USGS/GFSAD30LANDSAT_V1',    // Global Food Security 30m
      'USDA/NASS/CDL',             // Cropland Data Layer
      
      // Climate & Weather
      'ECMWF/ERA5/DAILY',          // ERA5 Climate Reanalysis
      'NOAA/GFS0P25',              // Global Forecast System
      'NASA/GLDAS/V021/NOAH/G025/T3H', // GLDAS
      
      // Water & Hydrology
      'WWF/HydroSHEDS/15CONDEM',   // HydroSHEDS 15s
      'JRC/GSW1_0/GlobalSurfaceWater', // Global Surface Water
      'USGS/WBD/2017/HUC12',       // Watershed Boundaries
      
      // Population & Human Impact
      'CIESIN/GPWv411/GPW_Population_Density', // Population Density
      'CIESIN/GPWv411/GPW_Population_Count',   // Population Count
      'DLR/WSF/WSF2015/v1',        // World Settlement Footprint
      
      // Protected Areas
      'WCMC/WDPA/current/polygons', // World Database on Protected Areas
      'USGS/GAP/PAD-US/v20',       // Protected Areas Database
      
      // Forest & Vegetation
      'UMD/hansen/global_forest_change_2021_v1_9', // Global Forest Change
      'MODIS/006/MOD44B',          // Vegetation Continuous Fields
      'NASA/ORNL/DAYMET_V4',       // Daymet Daily Surface Weather
      
      // Urban & Infrastructure
      'GOOGLE/DYNAMICWORLD/V1',    // Dynamic World
      'GOOGLE/Research/open-buildings/v3/polygons', // Open Buildings
      'GOOGLE/Research/open-roads/v1', // Open Roads
      
      // Soil & Geology
      'ISRIC/soilgrids/250m',      // SoilGrids
      'CSP/ERGo/1_0/Global/ALOS_landforms', // Global Landforms
      'CSP/ERGo/1_0/Global/SRTM_landforms'  // SRTM Landforms
    ];
  }

  /**
   * Generate an adaptive, Markdown-formatted answer.
   *
   * @param {string} query
   * @param {string} distilledFacts   Bullet-list of facts (or empty string)
   * @param {string[]} plan           Array of plan steps (or empty)
   * @param {string[]} codeExamples   Array of relevant code examples
   * @param {object[]} candidates     Array of candidate dataset references
   */
  async answer(query, distilledFacts = '', plan = [], codeExamples = [], candidates = []) {
    return tracer.startActiveSpan('AnswerAgent.answer', async span => {
      try {
        // Optional FACTS section
        const factsSection = distilledFacts && distilledFacts.length
          ? `### FACTS\n${Array.isArray(distilledFacts) ? distilledFacts.map(f => `- ${f}`).join('\n') : distilledFacts}\n`
          : '';

        // Optional PLAN section
        const planSection = plan && plan.length
          ? `### PLAN\n${Array.isArray(plan) ? plan.map((s, i) => `${i+1}. ${s}`).join('\n') : plan}\n`
          : '';

        // Optional CODE EXAMPLES section
        const codeExamplesSection = codeExamples && codeExamples.length
          ? `### RELEVANT CODE EXAMPLES\n${Array.isArray(codeExamples) ? codeExamples.map((code, i) => `Example ${i + 1}:\n\`\`\`js\n${code}\n\`\`\``).join('\n\n') : codeExamples}\n`
          : '';

        // Optional REFERENCES section
        const referencesSection = candidates.length
          ? `### REFERENCES\n${candidates
              .sort((a, b) => {
                // Get indices in priority list
                const aIndex = this.popularDatasets.indexOf(a.ee_code);
                const bIndex = this.popularDatasets.indexOf(b.ee_code);

                // If both are in priority list, sort by priority
                if (aIndex !== -1 && bIndex !== -1) {
                  return aIndex - bIndex;
                }
                // If only a is in priority list, a comes first
                if (aIndex !== -1) {
                  return -1;
                }
                // If only b is in priority list, b comes first
                if (bIndex !== -1) {
                  return 1;
                }
                // If neither is in priority list, sort by score
                return b.score - a.score;
              })
              .map(c => {
                const isPopular = this.popularDatasets.includes(c.ee_code);
                const bandInfo = c.bands ? `\n  - Bands: ${c.bands.map(band => 
                  `${band.name}${band.description ? ` (${band.description})` : ''}${band.pixel_size ? ` [${band.pixel_size}]` : ''}`
                ).join(', ')}` : '';
                return `- [${c.ee_code}](${c.url})${c.provider ? ` (Provider: ${c.provider})` : ''}${c.pixel_size ? ` - ${c.pixel_size} resolution` : ''}${isPopular ? ' 🔥' : ''}${bandInfo}`;
              })
              .join('\n')}\n`
          : '';

// Assemble prompt
const prompt = `
<system>
You are a precise and intelligent geospatial analysis assistant trained for Earth Engine and environmental economics tasks.  
You always respond using clearly structured **Markdown** with relevant sections depending on the query type.

Respond with these sections (include only those that are applicable to the question):

- ### QUESTION  
- ### BACKGROUND (optional, for context or definitions)  
- ### FACTS (optional, bullet format)  
- ### ANSWER (direct response to the query)  
- ### PLAN (optional, step-by-step approach)  
- ### CODE (optional, wrapped in \`\`\`js\`\`\`)  
- ### EXAMPLE (optional, concrete demonstration)  
- ### REFERENCES (optional, links to relevant datasets)

**Important Guidelines:**
- NEVER say "I cannot answer this" or "I don't know". Always provide the best possible answer based on your knowledge.
- If exact data is unavailable, provide general guidance, best practices, or alternative approaches.
- Prioritize clarity, factual correctness, and completeness.
- When answering about environmental economics (like ESV), base your answer on official methods (e.g., Costanza 1997, TEEB, InVEST).
- Always prefer data-backed explanations and include dataset references if geospatial imagery is required.
- For technical questions, provide practical code examples and explain key concepts.
- For conceptual questions, include relevant background information and real-world examples.
- If a question is unclear, make reasonable assumptions and state them explicitly.
- Always include relevant dataset references when available.
- Prioritize commonly used and well-documented datasets like Landsat, Sentinel, and MODIS.
- Include dataset resolution information when available.

**Code Generation Guidelines:**
- Use the provided code examples as reference when available
- Adapt and combine code examples to match the specific query
- Always generate complete, runnable Earth Engine code
- Follow the exact code structure shown in the examples
- Include proper error handling and data validation
- Use consistent variable naming conventions
- Add clear comments explaining each step
- Include visualization parameters for better results
- Ensure code follows Earth Engine best practices
- Test code for common edge cases
- Include proper data filtering and preprocessing
- Add appropriate scale and projection parameters
- Use efficient Earth Engine operations
- Include export options when relevant

</system>

${FEW_SHOT}

<user>
${query}
</user>

${factsSection}${planSection}${codeExamplesSection}${referencesSection}
<assistant>
`;

        const res = await this.model.generateContent(prompt);
        return res.response.text();
      } finally {
        span.end();
      }
    });
  }
}
