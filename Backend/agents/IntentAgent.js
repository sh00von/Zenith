// agents/IntentAgent.js
export class IntentAgent {
    constructor(model) {
      this.model = model;  // raw Gemini model
    }
  
    async extract(query) {
      console.log("Intent ▶️ extracting…");
      const prompt = `
  Extract intent and key entities from this user query.
  If the query is about code or implementation, include code-related entities.
  Respond with JSON: { 
    "intent": "...", 
    "entities": [ ... ],
    "needs_code": boolean,
    "code_type": "..." // e.g., "earth_engine", "javascript", "python", etc.
  }
  
  Query: "${query}"
  `;
      const res = await this.model.generateContent(prompt);
      const txt = await res.response.text();
      const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
      return JSON.parse(json);
    }
  }
  