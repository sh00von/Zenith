// agents/IntentAgent.js
export class IntentAgent {
    constructor(planner) {
      this.planner = planner;  // planner instance with unified interface
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
      const txt = await this.planner.generateContent(prompt);
      const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
      return JSON.parse(json);
    }
  }
  