// agents/CriticAgent.js
export class CriticAgent {
  constructor(model) {
    this.model = model;  // raw Gemini model
  }

  async critique(query, answer, facts) {
    console.log("Critic ▶️ evaluating…");
    const prompt = `
You are a critic. Given:
Question: "${query}"
Facts:
${facts.split('\n').map(f=>'- '+f).join('\n')}

Answer: "${answer}"

Respond JSON: { "confidence": 0.X, "improve": "…" }
`;
    const r   = await this.model.generateContent(prompt);
    const txt = await r.response.text();
    const json= txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
    return JSON.parse(json);
  }
}
