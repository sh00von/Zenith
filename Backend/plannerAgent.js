// plannerAgent.js
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { IntentAgent }    from './agents/IntentAgent.js';
import { SearchAgent }    from './agents/SearchAgent.js';
import { DistillAgent }   from './agents/DistillAgent.js';
import { AnswerAgent }    from './agents/AnswerAgent.js';
import { MemoryAgent }    from './agents/MemoryAgent.js';

const EMBEDDINGS_PATH  = './dataset_embeddings.json';
const EMBEDDING_MODEL  = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-1.5-flash';

export class PlannerAgent {
  constructor() {
    this.datasetEmbeddings = [];
  }

  async initialize() {
    console.log("Planner ▶️ loading embeddings…");
    if (!fs.existsSync(EMBEDDINGS_PATH)) {
      throw new Error(`${EMBEDDINGS_PATH} not found`);
    }
    this.datasetEmbeddings = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8'));

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel   = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
    this.generationModel  = ai.getGenerativeModel({ model: GENERATION_MODEL });

    this.intentAgent   = new IntentAgent(this.generationModel);
    this.searchAgent   = new SearchAgent(this.embeddingModel, this.datasetEmbeddings);
    this.distillAgent  = new DistillAgent(this.generationModel);
    this.answerAgent   = new AnswerAgent(this.generationModel);
    this.memoryAgent   = new MemoryAgent(EMBEDDINGS_PATH, this.datasetEmbeddings);

    console.log("Planner ▶️ all agents ready.");
  }

  async processQuery(query) {
    console.log(`Planner ▶️ processing query: "${query}"`);

    // 1) Intent
    const { intent, entities } = await this.intentAgent.extract(query);

    // 2) Search
    const { candidates, queryEmbedding } = await this.searchAgent.search(query, entities);

    // 3) Distill
    const distilledFacts = await this.distillAgent.distill(query, candidates);

    // 4) Answer
    const answer = await this.answerAgent.answer(query, distilledFacts);

    // 5) Memory
    this.memoryAgent.update(query, queryEmbedding);

    return {
      intent,
      entities,
      candidates: candidates.map(c => ({ ee_code: c.ee_code, score: c.score })),
      distilledFacts,
      answer
    };
  }
}

export const plannerAgent = new PlannerAgent();
