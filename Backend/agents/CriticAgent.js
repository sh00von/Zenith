// agents/CriticAgent.js
export class CriticAgent {
  /**
   * @param {object} planner  Your planner instance with unified interface
   */
  constructor(planner) {
    this.planner = planner;
  }

  /**
   * Asks the planner to critique the answer, then safely parses the JSON.
   *
   * @param {string} query
   * @param {string} answer
   * @param {string} facts  Distilled facts (bullet-list string)
   * @returns {Promise<{confidence:number, improve:string}>}
   */
  async critique(query, answer, facts) {
    console.log("Critic ▶️ evaluating…");
    const prompt = `
Given the query: "${query}"

The answer provided: "${answer}"

And these facts:
${Array.isArray(facts) ? facts.map(f => `- ${f}`).join('\n') : facts}

Evaluate the answer's quality and suggest improvements.
Respond with a JSON object in this format:
{
  "confidence": 0.8,  // number between 0 and 1
  "improve": "suggestion for improvement"  // string
}
`;
    try {
      const txt = await this.planner.generateContent(prompt);
      
      // Extract JSON object
      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      const json = jsonMatch[0];
      console.log(`Critic ▶️ Raw response: ${txt}`);
      console.log(`Critic ▶️ Extracted JSON: ${json}`);
      
      // Parse and validate JSON
      const critique = JSON.parse(json);
      if (typeof critique !== 'object') {
        throw new Error('Response is not an object');
      }
      
      // Validate required fields
      if (typeof critique.confidence !== 'number' || critique.confidence < 0 || critique.confidence > 1) {
        throw new Error('Invalid confidence value');
      }
      if (typeof critique.improve !== 'string') {
        throw new Error('Invalid improve value');
      }
      
      return critique;
    } catch (error) {
      console.error('Critic ❌ Error:', error.message);
      return {
        confidence: 0.5,
        improve: "Unable to evaluate response quality at this time."
      };
    }
  }
}
