// plannerAgent.js
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { PreprocessAgent }     from './agents/PreprocessAgent.js';
import { AttentionAgent }      from './agents/AttentionAgent.js';
import { IntentAgent }         from './agents/IntentAgent.js';
import { SearchAgent }         from './agents/SearchAgent.js';
import { DistillAgent }        from './agents/DistillAgent.js';
import { PlanningAgent }       from './agents/PlanningAgent.js';
import { AnswerAgent }         from './agents/AnswerAgent.js';
import { CriticAgent }         from './agents/CriticAgent.js';
import { MetacognitionAgent }  from './agents/MetacognitionAgent.js';
import { MemoryAgent }         from './agents/MemoryAgent.js';

const EMB_PATH   = './dataset_embeddings.json';
const EMB_MODEL  = 'text-embedding-004';
const GEN_MODEL  = 'gemini-2.0-flash-lite';

// set WRITE_MEMORY=1 to enable writes, anything else disables
const WRITE_MEMORY = process.env.WRITE_MEMORY === '1';

export class PlannerAgent {
  constructor() {
    this.embeddings = [];
  }

  async initialize() {
    console.log("Planner ▶️ loading embeddings from", EMB_PATH);
    if (!fs.existsSync(EMB_PATH)) {
      throw new Error(`Embeddings file not found at ${EMB_PATH}`);
    }
    this.embeddings = JSON.parse(fs.readFileSync(EMB_PATH, 'utf-8'));

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embedModel = ai.getGenerativeModel({ model: EMB_MODEL });
    this.genModel   = ai.getGenerativeModel({ model: GEN_MODEL });

    // instantiate agents
    this.pre      = new PreprocessAgent();
    this.attn     = new AttentionAgent();
    this.intent   = new IntentAgent(this.genModel);
    this.search   = new SearchAgent(this.embedModel, this.embeddings);
    this.distill  = new DistillAgent(this.genModel);
    this.planner  = new PlanningAgent(this.genModel);
    this.answer   = new AnswerAgent(this.genModel);
    this.critic   = new CriticAgent(this.genModel);
    this.meta     = new MetacognitionAgent(this.genModel);
    this.memory = new MemoryAgent(EMB_PATH, this.embeddings, WRITE_MEMORY);

    console.log("Planner ▶️ all agents ready.");
  }

  async processQuery(raw) {
    console.log(`\nPlanner ▶️ Received query: "${raw}"`);

    // 1) Perception
    const normalized = this.pre.preprocess(raw);

    // 2) Attention
    const tokens = this.attn.filterTokens(normalized);

    // 3) Intent
    const { intent, entities } = await this.intent.extract(normalized);

    // 4) Retrieval
    const { candidates, queryEmbedding } = await this.search.search(normalized, entities);

    // Defensive filter: remove any invalid entries
    const validCandidates = Array.isArray(candidates)
      ? candidates.filter(c => c && typeof c.text === 'string')
      : [];

    if (validCandidates.length === 0) {
      throw new Error('No valid search candidates found (all results missing `text`)');
    }
    console.log(`Planner ▶️ ${validCandidates.length} valid candidates`);

    // 5) Working Memory (Distillation)
    const distilledFacts = await this.distill.distill(normalized, validCandidates);

    // 6) Executive Planning
    const plan = await this.planner.plan(distilledFacts, normalized);

    // 7) Verbalization
    let answer = await this.answer.answer(normalized, distilledFacts, plan);

    // 8) Critic Loop
    const critique = await this.critic.critique(normalized, answer, distilledFacts);
    if (critique.confidence < 0.7 && critique.improve) {
      console.log('Planner ▶️ Critic suggests improvement:', critique.improve);
      answer = await this.answer.answer(
        normalized + ' (please improve: ' + critique.improve + ')',
        distilledFacts,
        plan
      );
    }

    // 9) Metacognition
    const selfEval = await this.meta.evaluate(answer, normalized);

    // 10) Memory Consolidation (may be disabled)
    this.memory.update(normalized, queryEmbedding);

    // Final structured JSON
    return {
      normalizedQuery: normalized,
      filteredTokens:  tokens,
      intent,
      entities,
      candidates: validCandidates.map(c => ({ ee_code: c.ee_code, score: c.score })),
      distilledFacts,
      plan,
      answer,
      critique,
      selfEval
    };
  }
}

export const plannerAgent = new PlannerAgent();
