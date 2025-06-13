// agents/AnswerAgent.js

export class AnswerAgent {
    constructor(generationModel) {
      this.model = generationModel;
    }
  
    async answer(query, distilledFacts) {
      console.log("AnswerAgent ▶️ generating final answer…");
      const prompt = `
  You are a versatile AI assistant. Use ONLY these distilled facts + your own knowledge to answer the user’s question.  
  If you must extrapolate beyond the facts, clearly say so.
  
  Distilled Facts:
  - ${distilledFacts}
  
  User Question: ${query}
  
  Answer in clear, conversational language:
  `;
      const r = await this.model.generateContent(prompt);
      return r.response.text();
    }
  }
  