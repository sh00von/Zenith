// agents/AnswerAgent.js
import { tracer } from '../utils/tracer.js';

/* ---------- System Prompt ---------- */
const SYSTEM_PROMPT = `You are an Earth Engine expert specializing in:
- Remote sensing & satellite imagery
- GIS & spatial analysis
- Environmental monitoring
- Land cover classification
- Terrain & hydrological analysis

Your responses should:
1. Be technically accurate
2. Follow Earth Engine best practices
3. Include proper data preprocessing
4. Consider spatial/temporal scales
5. Use efficient computation methods
6. Include validation & error handling

For general questions:
1. Provide clear, concise explanations
2. Use simple, accessible language
3. Include relevant examples
4. Focus on practical applications
5. Suggest next steps or resources`;

/* ---------- Few‐Shot Demonstrations ---------- */
const FEW_SHOT = `### EXAMPLE 1: General Question
<user>
What is Google Earth Engine and how can I get started?
</user>
<assistant>
### QUESTION
What is Google Earth Engine and how can I get started?

### BACKGROUND
Google Earth Engine is a cloud-based platform for planetary-scale geospatial analysis. It provides:
- Access to petabytes of satellite imagery
- Powerful computing infrastructure
- JavaScript and Python APIs
- Built-in algorithms and tools

### FACTS
- Free for research, education, and non-profit use
- Requires Google account and application
- Supports both JavaScript and Python
- Provides extensive documentation
- Includes Code Editor for quick start

### PLAN
1. Get started with Earth Engine
   - Create Google account
   - Apply for access
   - Explore documentation
2. Learn the basics
   - Try Code Editor
   - Run example scripts
   - Understand data types
3. Build first project
   - Choose simple analysis
   - Use sample datasets
   - Create visualization

### CODE
\`\`\`js
// Simple example: Load and display Landsat image
var image = ee.Image('LANDSAT/LC08/C01/T1_TOA/LC08_044034_20140318');
Map.centerObject(image, 9);
Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], max: 0.3}, 'Landsat 8');
\`\`\`

### EXAMPLE 2: Geospatial Analysis
<user>
How can I analyze urban heat island effects using Landsat thermal data?
</user>
<assistant>
### QUESTION
How can I analyze urban heat island effects using Landsat thermal data?

### BACKGROUND
Urban Heat Island (UHI) effect occurs when urban areas experience higher temperatures than surrounding rural areas. Key considerations:
- Temporal patterns
- Spatial resolution
- Atmospheric conditions
- Surface emissivity

### FACTS
- Landsat 8/9 TIRS band 10 provides thermal data at 100m resolution
- Surface temperature derived using Radiative Transfer Equation
- Urban areas show 2-5°C higher temperatures than rural areas
- Cloud cover affects thermal data quality

### PLAN
1. Load and preprocess Landsat collection
   - Filter by date and cloud cover
   - Calculate surface temperature
2. Mask clouds and water bodies
   - Use QA bands for cloud masking
   - Apply water mask
3. Calculate temperature statistics
   - Mean temperature by land cover
   - Urban-rural differences
4. Visualize results
   - Temperature gradient map
   - Statistical comparisons

### CODE
\`\`\`js

\`\`\`

### EXAMPLE 3: GIS Analysis
<user>
What's the best way to calculate watershed boundaries from DEM data?
</user>
<assistant>
### QUESTION
What's the best way to calculate watershed boundaries from DEM data?

### BACKGROUND
Watershed delineation identifies drainage areas based on DEMs. Key considerations:
- DEM resolution
- Flow accumulation thresholds
- Sink filling
- Pour point selection

### FACTS
- NASADEM provides 30m resolution global coverage
- Flow accumulation and direction are key calculations
- Pour points define watershed outlets
- Threshold selection affects watershed size

### PLAN
1. Load and preprocess DEM data
   - Fill sinks
   - Calculate flow direction
   - Compute flow accumulation
2. Extract stream network
   - Apply flow threshold
   - Generate stream order
3. Define pour points and delineate watersheds
   - Select outlet locations
   - Calculate boundaries

### CODE
\`\`\`js

\`\`\`
</assistant>
`;

/* ---------- AnswerAgent Class ---------- */
export class AnswerAgent {
  constructor(planner, useAzure = false) {
    this.planner = planner;  // planner instance with unified interface
    this.useAzure = useAzure;  // whether to use Azure OpenAI
    this.popularDatasets = [
      // Satellite Imagery
      'LANDSAT/LC09/C02/T1_L2',    // Landsat 9 (newest)
      'LANDSAT/LC08/C02/T1_L2',    // Landsat 8
      'COPERNICUS/S2_SR_HARMONIZED', // Sentinel-2 Harmonized
      'COPERNICUS/S1_GRD',         // Sentinel-1
      'MODIS/061/MOD13Q1',         // MODIS NDVI (v6.1)
      'MODIS/061/MOD11A1',         // MODIS LST (v6.1)
      'MODIS/061/MCD12Q1',         // MODIS Land Cover (v6.1)
      
      // Administrative Boundaries
      'FAO/GAUL_SIMPLIFIED_500m/2015/level0',  // FAO GAUL Country Level
      'FAO/GAUL_SIMPLIFIED_500m/2015/level1',  // FAO GAUL First Level
      'FAO/GAUL_SIMPLIFIED_500m/2015/level2',  // FAO GAUL Second Level
      
      // Elevation & Terrain
      'NASA/NASADEM_HGT/001',      // NASADEM (newer than SRTM)
      'COPERNICUS/DEM/GLO30',      // Copernicus 30m DEM
      'WWF/HydroSHEDS/15CONDEM',   // HydroSHEDS 15s
      
      // Land Cover & Land Use
      'ESA/WorldCover/v200',       // ESA WorldCover v2.0
      'COPERNICUS/Landcover/100m/Proba-V-C3/Global', // Copernicus Land Cover
      'USGS/GAP/CONUS/2020',       // GAP Analysis 2020
      
      // Agriculture & Food Security
      'USDA/NASS/CDL',             // Cropland Data Layer
      'USGS/GFSAD1000_V1',         // Global Food Security 1km
      
      // Climate & Weather
      'ECMWF/ERA5_LAND/HOURLY',    // ERA5-Land (higher resolution)
      'NOAA/GFS0P25',              // Global Forecast System
      'NASA/GLDAS/V021/NOAH/G025/T3H', // GLDAS
      
      // Water & Hydrology
      'JRC/GSW1_4/GlobalSurfaceWater', // Global Surface Water v1.4
      'USGS/WBD/2021/HUC12',       // Watershed Boundaries 2021
      
      // Population & Human Impact
      'CIESIN/GPWv411/GPW_Population_Density', // Population Density
      'CIESIN/GPWv411/GPW_Population_Count',   // Population Count
      'GOOGLE/Research/open-buildings/v3/polygons', // Open Buildings
      
      // Protected Areas
      'WCMC/WDPA/current/polygons', // World Database on Protected Areas
      'USGS/GAP/PAD-US/v30',       // Protected Areas Database v3.0
      
      // Forest & Vegetation
      'UMD/hansen/global_forest_change_2022_v1_10', // Global Forest Change 2022
      'MODIS/061/MOD44B',          // Vegetation Continuous Fields v6.1
      'NASA/ORNL/DAYMET_V4',       // Daymet Daily Surface Weather
      
      // Urban & Infrastructure
      'GOOGLE/DYNAMICWORLD/V1',    // Dynamic World
      'GOOGLE/Research/open-roads/v1', // Open Roads
      
      // Soil & Geology
      'ISRIC/soilgrids/250m/v1',   // SoilGrids v1
      'CSP/ERGo/1_0/Global/ALOS_landforms', // Global Landforms
      'CSP/ERGo/1_0/Global/SRTM_landforms'  // SRTM Landforms
    ];
  }

  async answer(query, distilledFacts = '', plan = [], codeExamples = [], candidates = []) {
    return tracer.startActiveSpan('AnswerAgent.answer', async span => {
      try {
        const prompt = `
${SYSTEM_PROMPT}

${FEW_SHOT}

### QUESTION
${query}

### BACKGROUND
${distilledFacts}

### PLAN
${plan.map(step => `${step.step}. ${step.instruction}`).join('\n')}

### CODE EXAMPLES
${codeExamples.join('\n\n')}

### DATASETS
${candidates.map(c => `- ${c.ee_code}: ${c.description || 'No description available'}`).join('\n')}

Please provide a comprehensive answer following the format of the examples above. Focus on:
1. Technical accuracy
2. Earth Engine best practices
3. Data preprocessing
4. Spatial/temporal considerations
5. Efficient computation
6. Validation & error handling

For general questions, also:
1. Use clear, simple language
2. Provide practical examples
3. Include next steps
4. Suggest learning resources
`;
        const response = await this.planner.generateContent(prompt, this.useAzure);
        return response;
      } catch (error) {
        console.error('Answer ❌ Error:', error);
        return "I apologize, but I'm having trouble generating a response at this time.";
      } finally {
        span.end();
      }
    });
  }
}
