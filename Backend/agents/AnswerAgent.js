// agents/AnswerAgent.js
import { tracer } from '../utils/tracer.js';

/* ---------- Few‐Shot Demonstrations ---------- */
const FEW_SHOT = `### EXAMPLE 1: Conceptual
<user>
What is NDVI and why is it important for monitoring vegetation?
</user>
<assistant>
### QUESTION
What is NDVI and why is it important for monitoring vegetation?

### BACKGROUND
NDVI stands for “Normalized Difference Vegetation Index.”

### FACTS
- Healthy plants reflect more near-infrared and absorb more red light.
- NDVI = (NIR - RED) / (NIR + RED).

### ANSWER
NDVI quantifies vegetation health by comparing NIR and red reflectance. Values near +1 indicate lush vegetation; values near 0 or negative indicate bare soil or water.

### EXAMPLE
A forest region might yield NDVI ≈ 0.8, while a desert yields ≈ 0.1.

</assistant>

### EXAMPLE 2: Code Generation
<user>
How can I calculate NDVI for 2023 over Bangladesh in Earth Engine?
</user>
<assistant>
### QUESTION
How can I calculate NDVI for 2023 over Bangladesh in Earth Engine?

### FACTS
- Sentinel-2 SR has band B8 (NIR) and B4 (Red).
- Use filterDate and normalizedDifference.

### PLAN
1. Load Sentinel-2 SR collection.  
2. Filter by date “2023-01-01” to “2023-12-31” and region.  
3. Compute median composite.  
4. Calculate NDVI = normalizedDifference(['B8','B4']).  
5. Display on map.

### CODE
\`\`\`js
var region = ee.FeatureCollection('FAO/GAUL/2015/level1')
               .filter(ee.Filter.eq('ADM0_NAME','Bangladesh'));
var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
           .filterDate('2023-01-01','2023-12-31')
           .filterBounds(region)
           .median();
var ndvi = s2.normalizedDifference(['B8','B4']).rename('NDVI');
Map.centerObject(region, 7);
Map.addLayer(ndvi, {min:0, max:1, palette:['yellow','green']}, 'NDVI 2023');
\`\`\`
</assistant>

### EXAMPLE 3: Advanced Analysis
<user>
I need to identify areas of exposed soil and track change since 2010.
</user>
<assistant>
### QUESTION
I need to identify areas of exposed soil and track change since 2010.

### BACKGROUND
Exposed soil often shows low NDVI (<0.2).

### FACTS
- Use Landsat 5 for 2010 and Landsat 8 for 2023.  
- NDVI threshold <0.2 indicates bare soil.

### ANSWER
To track soil exposure, compute NDVI composites for 2010 and 2023, mask areas with NDVI < 0.2, then compare masks to highlight new exposures.

### PLAN
1. Load Landsat 5 SR (2010) and Landsat 8 SR (2023).  
2. Compute median composites for both.  
3. Calculate NDVI and mask (<0.2).  
4. Compute mask difference (new exposures).  
5. Visualize or export results.

### CODE
\`\`\`js
// 2010 composite
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
           .filterDate('2010-01-01','2010-12-31')
           .median();
var ndvi2010 = l5.normalizedDifference(['B4','B3']).rename('NDVI2010');
// 2023 composite
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
           .filterDate('2023-01-01','2023-12-31')
           .median();
var ndvi2023 = l8.normalizedDifference(['B5','B4']).rename('NDVI2023');
// mask exposed soil
var soil2010 = ndvi2010.lt(0.2);
var soil2023 = ndvi2023.lt(0.2);
// change detection
var newSoil = soil2023.and(soil2010.not());
Map.addLayer(newSoil, {palette:['white','brown']}, 'New Exposed Soil');
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
   */
  async answer(query, distilledFacts = '', plan = []) {
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
- Dont say im sorry i dont know.Just answer from you ai knwoldge if no data found correctly .
- Prioritize clarity, factual correctness, and completeness.
- When answering about environmental economics (like ESV), base your answer on official methods (e.g., Costanza 1997, TEEB, InVEST).
- Always prefer data-backed explanations and include dataset references if geospatial imagery is required.

</system>

${FEW_SHOT}

<user>
${query}
</user>

${factsSection}${planSection}
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
