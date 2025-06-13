// agents/DistillAgent.js
export class DistillAgent {
    constructor(model) {
      this.model = model;  // raw Gemini model
    }
  
    async distill(query, candidates) {
      console.log("Distill ▶️ extracting facts…");
      const prompt = `
Given the query "${query}" and these dataset candidates, extract the most relevant facts.
Format the response as a JSON array of strings, each containing one fact.
Example format:
[
  "Fact 1 about dataset",
  "Fact 2 about dataset",
  "Fact 3 about dataset"
]
`;
      try {
        const r = await this.model.generateContent(prompt);
        const txt = await r.response.text();
        
        // Extract JSON array
        const jsonMatch = txt.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in response');
        }
        
        const json = jsonMatch[0];
        console.log(`Distill ▶️ Raw response: ${txt}`);
        console.log(`Distill ▶️ Extracted JSON: ${json}`);
        
        // Parse and validate JSON
        const facts = JSON.parse(json);
        if (!Array.isArray(facts)) {
          throw new Error('Response is not an array');
        }
        
        // Validate each fact
        facts.forEach((fact, i) => {
          if (typeof fact !== 'string') {
            throw new Error(`Fact ${i + 1} is not a string`);
          }
        });
        
        return facts;
      } catch (error) {
        console.error('Distill ❌ Error:', error.message);
        return [];
      }
    }
}
  