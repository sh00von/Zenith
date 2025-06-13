// agents/IntentAgent.js
import { GoogleGenerativeAI } from '@google/generative-ai';

export class IntentAgent {
  constructor(generationModel) {
    this.model = generationModel;
  }

  async extract(query) {
    console.log("IntentAgent ▶️ extracting intent…");
    const prompt = `
Extract the intent and key entities from this user query.  
Respond with JSON: { "intent": "...", "entities": [ ... ] }.

Query: "${query}"
`;
    const res  = await this.model.generateContent(prompt);
    const txt  = await res.response.text();
    const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
    return JSON.parse(json);
  }
}
