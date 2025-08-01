// agents/PreprocessAgent.js
export class PreprocessAgent {
    constructor(planner) {
      this.planner = planner;  // planner instance with unified interface
    }

    async preprocess(query) {
      console.log("Preprocess ▶️ correcting grammar and consistency...");
      
      // First normalize basic formatting
      const normalized = query.trim().replace(/\s+/g, ' ');
      
      // AI-based correction prompt
      const prompt = `
You are an expert in Earth Engine and geospatial analysis. Correct this query by:
1. Fixing spelling and grammar
2. Expanding abbreviations (e.g., "bd" to "Bangladesh")
3. Using proper technical terms
4. Making it clear and professional
5. Preserving Earth Engine specific terminology

Examples of corrections:
- "admin boundary llaer of bd" → "administrative boundary layer of Bangladesh"
- "ndvi imageri" → "NDVI imagery"
- "landsat satelite" → "Landsat satellite imagery"
- "gee code" → "Earth Engine code"

Only return the corrected query, nothing else. Do not add any quotes.

Query: "${normalized}"
`;
      
      try {
        const corrected = await this.planner.generateContent(prompt);
        const cleaned = corrected
          .trim()
          .replace(/^["']|["']$/g, ''); // Remove any surrounding quotes
        
        console.log(`Preprocess ▶️ Original: "${normalized}"`);
        console.log(`Preprocess ▶️ Corrected: "${cleaned}"`);
        
        return cleaned || normalized; // Fallback to normalized if corrected is empty
      } catch (err) {
        console.warn("Preprocess ▶️ Grammar correction failed, using normalized query:", err);
        return normalized;
      }
    }
  }
  