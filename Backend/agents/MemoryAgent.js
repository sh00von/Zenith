// agents/MemoryAgent.js
import fs from 'fs';

export class MemoryAgent {
  constructor(path, embeddings) {
    this.path       = path;
    this.embeddings = embeddings;
  }

  update(query, embedding) {
    console.log("Memory ▶️ saving new memory…");
    this.embeddings.push({
      ee_code: `user-${Date.now()}`,
      text:     query,
      embedding
    });
    fs.writeFileSync(this.path, JSON.stringify(this.embeddings, null,2));
    console.log("Memory ▶️ saved.");
  }
}
