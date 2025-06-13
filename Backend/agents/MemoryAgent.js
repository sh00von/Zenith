// agents/MemoryAgent.js
import fs from 'fs';

export class MemoryAgent {
  /**
   * @param {string|null} path         The filepath for embeddings (or null)
   * @param {Array}       embeddings   In-memory embeddings array
   * @param {boolean}     writeEnabled Whether writing to disk is allowed
   */
  constructor(path, embeddings, writeEnabled = false) {
    this.path         = writeEnabled ? path : null;
    this.embeddings   = embeddings;
    this.writeEnabled = writeEnabled;
  }

  update(query, embedding) {
    // 1) If writing is disabled, just log and return
    if (!this.writeEnabled) {
      console.log("Memory ▶️ writing disabled, skipping update.");
      return;
    }

    // 2) If no valid path, warn and return
    if (!this.path) {
      console.warn("Memory ▶️ no path provided, cannot write embeddings.");
      return;
    }

    // 3) Append to memory and attempt to write
    console.log("Memory ▶️ saving new memory…");
    this.embeddings.push({
      ee_code:  `user-${Date.now()}`,
      text:      query,
      embedding
    });

    try {
      fs.writeFileSync(this.path, JSON.stringify(this.embeddings, null, 2));
      console.log("Memory ▶️ saved.");
    } catch (err) {
      if (err.code === 'EROFS') {
        console.warn("Memory ▶️ read-only filesystem, skipping write.");
      } else {
        console.error("Memory ▶️ unexpected error writing embeddings:", err);
      }
    }
  }
}
