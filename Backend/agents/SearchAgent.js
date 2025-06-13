// agents/SearchAgent.js
import { tracer } from '../utils/tracer.js';
import { buildBM25 } from '../utils/bm25Index.js';

export class SearchAgent {
  constructor(embeddingModel, embeddings) {
    this.embeddingModel = embeddingModel;

    // 1) Filter to only embeddings with a valid `text` string and an array embedding
    this.embeddings = Array.isArray(embeddings)
      ? embeddings.filter(ds =>
          ds &&
          typeof ds.text === 'string' &&
          Array.isArray(ds.embedding) &&
          ds.embedding.length > 0 &&
          typeof ds.ee_code === 'string' &&
          typeof ds.js_code === 'string'
        )
      : [];

    if (this.embeddings.length !== embeddings.length) {
      console.warn(
        `SearchAgent ▶️ filtered out ${
          embeddings.length - this.embeddings.length
        } invalid embedding entries`
      );
    }

    // 2) Build BM25 index only over the valid embeddings
    this.bm25 = buildBM25(this.embeddings);
  }

  // Cosine-similarity helpers
  dot(a, b) {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }

  mag(a) {
    return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  }

  cosine(a, b) {
    try {
      return this.dot(a, b) / (this.mag(a) * this.mag(b));
    } catch {
      return 0;
    }
  }

  async search(query, entities = []) {
    return tracer.startActiveSpan('SearchAgent.search', async span => {
      try {
        // 1) Vector embed
        const embRes = await this.embeddingModel.embedContent(query);
        const qEmb   = embRes.embedding.values;

        // 2) Semantic scoring
        const sem = this.embeddings
          .map(ds => ({
            ...ds,
            vscore: this.cosine(ds.embedding, qEmb)
          }))
          .sort((a, b) => b.vscore - a.vscore)
          .slice(0, 10);

        // 3) BM25 keyword scores
        let bm25Map = new Map();
        try {
          const bm25Results = this.bm25
            .search(query, { expand: true })
            .map(r => ({ ee_code: r.ref, kscore: r.score }));
          bm25Map = new Map(bm25Results.map(r => [r.ee_code, r.kscore]));
        } catch (err) {
          console.error('SearchAgent ▶️ BM25 error:', err);
        }

        // 4) Merge semantic + BM25 scores
        const merged = sem
          .map(doc => ({
            ...doc,
            score: 0.7 * doc.vscore + 0.3 * (bm25Map.get(doc.ee_code) || 0)
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        span.setAttribute('candidate.count', merged.length);
        return { candidates: merged, queryEmbedding: qEmb };
      } finally {
        span.end();
      }
    });
  }
}
