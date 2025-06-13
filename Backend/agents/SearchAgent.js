// agents/SearchAgent.js

export class SearchAgent {
    constructor(embeddingModel, datasetEmbeddings) {
      this.embeddingModel    = embeddingModel;
      this.datasetEmbeddings = datasetEmbeddings;
    }
  
    // — Cosine helpers —
    dot(a, b) { return a.reduce((sum, v, i) => sum + v * b[i], 0); }
    mag(a)    { return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0)); }
    cosine(a, b) { return this.dot(a, b) / (this.mag(a) * this.mag(b)); }
  
    async search(query, entities = []) {
      console.log("SearchAgent ▶️ embedding query…");
      const embRes         = await this.embeddingModel.embedContent(query);
      const queryEmbedding = embRes.embedding.values;
  
      console.log("SearchAgent ▶️ semantic scoring…");
      const scored = this.datasetEmbeddings
        .map(ds => ({ ...ds, score: this.cosine(ds.embedding, queryEmbedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
  
      console.log("SearchAgent ▶️ keyword matching…");
      // Ensure every entity is a string before lowercasing
      const keywordMatches = this.datasetEmbeddings.filter(ds =>
        entities.some(rawE => {
          const e = String(rawE).toLowerCase();
          return ds.text.toLowerCase().includes(e);
        })
      );
  
      // Combine & dedupe by ee_code
      const map = new Map();
      scored.concat(keywordMatches).forEach(item => map.set(item.ee_code, item));
  
      const candidates = Array.from(map.values()).slice(0, 10);
      console.log(`SearchAgent ▶️ returning ${candidates.length} candidates.`);
  
      return { candidates, queryEmbedding };
    }
  }
  