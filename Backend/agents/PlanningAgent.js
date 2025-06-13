// agents/PlanningAgent.js
export class PlanningAgent {
    constructor(model) {
      this.model = model;  // raw Gemini model
    }
  
    async plan(distilled, query) {
      console.log("Plan ▶️ generating steps…");
      const prompt = `
  Based on these facts:
  ${distilled.split('\n').map(f=>'- '+f).join('\n')}
  
  And the question: "${query}"
  
  Respond with a JSON array of step-by-step instructions.
  `;
      const r   = await this.model.generateContent(prompt);
      const txt = await r.response.text();
      const json= txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1);
      console.log(`Plan ▶️ ${json}`);
      return JSON.parse(json);
    }
  }
  