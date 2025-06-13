// agents/PlanningAgent.js
export class PlanningAgent {
    constructor(model) {
      this.model = model;  // raw Gemini model
    }
  
    async plan(distilled, query) {
      console.log("Plan ▶️ generating steps…");
      const prompt = `
Based on these facts:
${Array.isArray(distilled) ? distilled.map(f => `- ${f}`).join('\n') : distilled}

And the question: "${query}"

Respond with a JSON array of step objects in this format:
[
  {
    "step": 1,
    "instruction": "First step description"
  },
  {
    "step": 2,
    "instruction": "Second step description"
  },
  {
    "step": 3,
    "instruction": "Third step description"
  }
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
        console.log(`Plan ▶️ Raw response: ${txt}`);
        console.log(`Plan ▶️ Extracted JSON: ${json}`);
        
        // Parse and validate JSON
        const steps = JSON.parse(json);
        if (!Array.isArray(steps)) {
          throw new Error('Response is not an array');
        }
        
        // Validate each step
        steps.forEach((step, i) => {
          if (typeof step !== 'object') {
            throw new Error(`Step ${i + 1} is not an object`);
          }
          if (typeof step.step !== 'number') {
            throw new Error(`Step ${i + 1} missing or invalid step number`);
          }
          if (typeof step.instruction !== 'string') {
            throw new Error(`Step ${i + 1} missing or invalid instruction`);
          }
        });
        
        return steps;
      } catch (error) {
        console.error('Plan ❌ Error:', error.message);
        // Return default steps if parsing fails
        return [
          {
            step: 1,
            instruction: "Analyze the query requirements"
          },
          {
            step: 2,
            instruction: "Identify relevant Earth Engine datasets"
          },
          {
            step: 3,
            instruction: "Generate appropriate Earth Engine code"
          }
        ];
      }
    }
}
  