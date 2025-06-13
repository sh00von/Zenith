// agents/DistillAgent.js
export class DistillAgent {
    constructor(model) {
      this.model = model;  // raw Gemini model
    }
  
    async distill(query, candidates) {
      console.log("Distill ▶️ extracting facts…");
      const facts = await Promise.all(candidates.map(async (c, idx) => {
        if (!c || typeof c.text !== 'string') return '';
        const prompt = `
  Given the query "${query}" and this dataset info, extract the single most relevant fact only 5-6 facts:
  "${c.text}"
  `;
        try {
          const r = await this.model.generateContent(prompt);
          const fact = (await r.response.text()).trim();
          console.log(`Distill ▶️ fact #${idx}: ${fact.substring(0, 60)}…`);
          return fact;
        } catch (err) {
          console.error(`Distill ▶️ error #${idx}:`, err);
          return '';
        }
      }));
      return facts.filter(f => f).join('\n- ');
    }
  }
  