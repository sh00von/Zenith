// agents/MetacognitionAgent.js
export class MetacognitionAgent {
    constructor(model) {
      this.model = model;  // should be the raw Gemini model
    }
  
    async evaluate(answer, query) {
      console.log("Meta ▶️ self‐evaluating…");
      const prompt = `
  Assess this answer’s correctness & completeness.
  
  Question: "${query}"
  Answer: "${answer}"
  
  Respond JSON: { "confidence": 0.X, "notes": "…" }
  `;
      // ← use generateContent, not generateWithUsage
      const res = await this.model.generateContent(prompt);
      const txt = await res.response.text();
      const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
      return JSON.parse(json);
    }
  }
  