// agents/CriticAgent.js
export class CriticAgent {
  /**
   * @param {object} model  Your raw Gemini model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Asks the model to critique the answer, then safely parses the JSON.
   *
   * @param {string} query
   * @param {string} answer
   * @param {string} facts  Distilled facts (bullet-list string)
   * @returns {Promise<{confidence:number, improve:string}>}
   */
  async critique(query, answer, facts) {
    console.log("Critic ▶️ evaluating…");
    const prompt = `
You are a critic. Given the following:

Question:
"${query}"

Facts:
${facts.split('\n').map(f => '- ' + f).join('\n')}

Answer:
"${answer}"

**Please respond with ONE valid JSON object** with exactly two keys:
- "confidence": a number between 0.8 and 1.0 indicating how good the answer is.
- "improve": a short suggestion for how to improve, or an empty string if none.
if in answwer says sorry no information provided in context like this then , process on your own . suggest answer then .

Do **NOT** include any other text, comments, or control characters. Example:

{"confidence":0.72,"improve":"Explain how to handle cloud masking."}
`;
    // ask the model
    const res = await this.model.generateContent(prompt);
    const raw = await res.response.text();

    // extract the JSON substring
    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    if (start === -1 || end === -1) {
      console.error("Critic ▶️ no JSON found in response:", raw);
      return { confidence: 1.0, improve: "" };
    }
    let jsonText = raw.substring(start, end + 1);

    // remove non-printable control characters
    jsonText = jsonText.replace(/[\u0000-\u001F]+/g, '');

    // parse safely
    try {
      const obj = JSON.parse(jsonText);
      // validate types
      if (typeof obj.confidence === 'number' && typeof obj.improve === 'string') {
        return obj;
      }
      throw new Error("Parsed JSON missing required keys or types");
    } catch (err) {
      console.error("Critic ▶️ JSON.parse error:", err, "text:", jsonText);
      // fallback
      return { confidence: 1.0, improve: "" };
    }
  }
}
