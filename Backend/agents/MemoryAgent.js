// agents/MemoryAgent.js
import fs from 'fs';

export class MemoryAgent {
  constructor(path, embeddings) {
    this.path       = path;
    this.embeddings = embeddings;
  }

  update(query, queryEmbedding) {
    console.log("MemoryAgent ▶️ updating embeddings…");
    this.embeddings.push({
      ee_code:  `user-${Date.now()}`,
      text:     query,
      embedding: queryEmbedding
    });
    fs.writeFileSync(this.path, JSON.stringify(this.embeddings, null, 2));
    console.log("MemoryAgent ▶️ embeddings file written.");
  }
}
