// agents/MetacognitionAgent.js
export class MetacognitionAgent {
    constructor(planner) {
      this.planner = planner;  // planner instance with unified interface
    }
  
    async evaluate(answer, query) {
      console.log("Meta ▶️ self‐evaluating…");
      const prompt = `
  Assess this answer's correctness & completeness.
  
  Question: "${query}"
  Answer: "${answer}"
  
  Respond JSON: { "confidence": 0.X, "notes": "…" }
  `;
      try {
        const txt = await this.planner.generateContent(prompt);
        const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
        return JSON.parse(json);
      } catch (error) {
        console.error('Meta ❌ Error:', error);
        return {
          confidence: 0.5,
          notes: "Unable to perform self-evaluation at this time."
        };
      }
    }
  }
  