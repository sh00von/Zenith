// agents/SearchAgent.js
import { tracer } from '../utils/tracer.js';
import { buildBM25 } from '../utils/bm25Index.js';

export class SearchAgent {
  constructor(planner) {
    this.planner = planner;
    this.embeddings = planner.embeddings;

    // 1) Filter to only embeddings with a valid `text` string and an array embedding
    this.embeddings = Array.isArray(this.embeddings)
      ? this.embeddings.filter(ds =>
          ds &&
          typeof ds.text === 'string' &&
          Array.isArray(ds.embedding) &&
          ds.embedding.length > 0 &&
          typeof ds.ee_code === 'string' &&
          typeof ds.js_code === 'string'
        )
      : [];

    if (this.embeddings.length !== planner.embeddings.length) {
      console.warn(
        `SearchAgent ▶️ filtered out ${
          planner.embeddings.length - this.embeddings.length
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

  async search(query, candidates) {
    return tracer.startActiveSpan('SearchAgent.search', async span => {
      try {
        // Generate embedding for the query
        const queryEmbedding = await this.planner.embedContent(query);
        
        // Calculate cosine similarity for each candidate
        const results = candidates.map(candidate => {
          const similarity = this.cosine(
            queryEmbedding,
            candidate.embedding
          );
          
          // Boost score if query terms match band names or descriptions
          let score = similarity;
          if (candidate.bands) {
            const queryTerms = query.toLowerCase().split(/\s+/);
            const bandMatches = candidate.bands.filter(band => {
              const bandText = `${band.name} ${band.description || ''}`.toLowerCase();
              return queryTerms.some(term => bandText.includes(term));
            });
            if (bandMatches.length > 0) {
              score += 0.1 * bandMatches.length; // Boost score for band matches
            }
          }
          
          return {
            ...candidate,
            score: Math.min(1, score) // Cap score at 1
          };
        });
        
        // Sort by score and take top 5
        return results
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      } catch (error) {
        console.error('Search ❌ Error:', error);
        return [];
      }
    });
  }
}
