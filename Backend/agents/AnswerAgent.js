// agents/AnswerAgent.js
import { tracer } from '../utils/tracer.js';

/* ---------- Few-shot exemplars (all inner back-ticks escaped) ---------- */
const FEW_SHOT = `### EXAMPLE 1
<user>
How to compute NDVI in GEE?
</user>
<assistant>
### ANALYSIS
We need a vegetation index (NDVI) from Sentinel-2 SR imagery.

### PLAN
1. Load Sentinel-2 SR collection.  
2. Select NIR (B8) and RED (B4) bands.  
3. Compute NDVI = (NIR-RED)/(NIR+RED).  
4. Visualize on the map.

### CODE
\\\`\\\`\\\`js
var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
           .filterDate('2020-01-01','2020-12-31')
           .median();
var ndvi = s2.normalizedDifference(['B8','B4']).rename('NDVI');
Map.addLayer(ndvi, {min:0, max:1, palette:['brown','yellow','green']});
\\\`\\\`\\\`
</assistant>

### EXAMPLE 2
<user>
Mask clouds in Landsat 8?
</user>
<assistant>
### ANALYSIS
Use the QA\_PIXEL band to mask clouds and shadows.

### PLAN
1. Load Landsat 8 SR collection.  
2. Define a \\maskL8()\\ helper that decodes QA bits.  
3. Map this function over the collection.

### CODE
\\\`\\\`\\\`js
function maskL8(img){
  var qa = img.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(1<<3).eq(0)   // cloud
                .and(qa.bitwiseAnd(1<<4).eq(0)); // shadow
  return img.updateMask(clear);
}
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
            .map(maskL8);
\\\`\\\`\\\`
</assistant>`;

/* ---------- AnswerAgent ---------- */
export class AnswerAgent {
  constructor(model) {
    this.model = model;
  }

  async answer(query, distilledFacts, plan) {
    return tracer.startActiveSpan('AnswerAgent.answer', async span => {
      try {
        const planMd = plan.map((s, i) => `${i + 1}. ${s}`).join('  \n');
        const prompt = `
<system>
Return **one Markdown document** in exactly three sections:  
### ANALYSIS (one paragraph)  
### PLAN (numbered list)  
### CODE (single \\\`\\\`\\\`js fenced block, no text after).  
</system>

${FEW_SHOT}

<facts>
${distilledFacts.split('\n').map(f => '- ' + f).join('\n')}
</facts>

<plan-hint>
${planMd}
</plan-hint>

<user>
${query}
</user>
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
