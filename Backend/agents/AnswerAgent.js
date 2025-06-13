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
  }

  /**
   * Generate an adaptive, Markdown-formatted answer.
   *
   * @param {string} query
   * @param {string} distilledFacts   Bullet-list of facts (or empty string)
   * @param {string[]} plan           Array of plan steps (or empty)
   * @param {string[]} codeExamples   Array of relevant code examples
   */
  async answer(query, distilledFacts = '', plan = [], codeExamples = []) {
    return tracer.startActiveSpan('AnswerAgent.answer', async span => {
      try {
        // Optional FACTS section
        const factsSection = distilledFacts
          ? `### FACTS\n${distilledFacts.split('\n').map(f => '- ' + f).join('\n')}\n`
          : '';

        // Optional PLAN section
        const planSection = plan.length
          ? `### PLAN\n${plan.map((s, i) => `${i+1}. ${s}`).join('  \n')}\n`
          : '';

        // Optional CODE EXAMPLES section
        const codeExamplesSection = codeExamples.length
          ? `### RELEVANT CODE EXAMPLES\n${codeExamples.map((code, i) => `Example ${i + 1}:\n\`\`\`js\n${code}\n\`\`\``).join('\n\n')}\n`
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

**Important Guidelines:**
- NEVER say "I cannot answer this" or "I don't know". Always provide the best possible answer based on your knowledge.
- If exact data is unavailable, provide general guidance, best practices, or alternative approaches.
- Prioritize clarity, factual correctness, and completeness.
- When answering about environmental economics (like ESV), base your answer on official methods (e.g., Costanza 1997, TEEB, InVEST).
- Always prefer data-backed explanations and include dataset references if geospatial imagery is required.
- For technical questions, provide practical code examples and explain key concepts.
- For conceptual questions, include relevant background information and real-world examples.
- If a question is unclear, make reasonable assumptions and state them explicitly.

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

${factsSection}${planSection}${codeExamplesSection}
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
