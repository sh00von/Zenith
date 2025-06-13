// agents/DistillAgent.js

export class DistillAgent {
    constructor(generationModel) {
      this.model = generationModel;
    }
  
    async distill(query, candidates) {
      console.log("DistillAgent ▶️ distilling context…");
      const facts = await Promise.all(candidates.map(async c => {
        const prompt = `
  Given the user query "${query}" and this dataset description, extract the single most relevant fact:
  "${c.text}"
  `;
        const r = await this.model.generateContent(prompt);
        return (await r.response.text()).trim();
      }));
      return facts.join('\n- ');
    }
  }
  