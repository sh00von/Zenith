// agents/PreprocessAgent.js
export class PreprocessAgent {
    preprocess(query) {
      const normalized = query.trim().replace(/\s+/g, ' ');
      console.log(`Preprocess ▶️ "${normalized}"`);
      return normalized;
    }
  }
  