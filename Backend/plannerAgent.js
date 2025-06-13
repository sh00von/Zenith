// plannerAgent.js
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { tracer } from './utils/tracer.js';

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
    this.pre      = new PreprocessAgent(this.genModel);
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

  async processQuery(query) {
    return tracer.startActiveSpan('PlannerAgent.processQuery', async span => {
      try {
        // 1) Preprocess
        const preprocessed = await this.pre.preprocess(query);
        console.log(`Planner ▶️ Preprocessed: "${preprocessed}"`);

        // 2) Get filtered tokens
        const filteredTokens = this.attn.filterTokens(preprocessed);
        console.log(`Planner ▶️ Filtered tokens:`, filteredTokens);

        // 3) Search for relevant datasets
        const searchResults = await this.search.search(preprocessed, this.embeddings);
        const candidates = searchResults.map(result => ({
          ee_code: result.ee_code,
          url: result.url,
          provider: result.provider,
          pixel_size: result.pixel_size,
          bands: result.bands,
          score: result.score
        }));

        // 4) Extract entities
        const entities = await this.intent.extract(preprocessed);
        console.log(`Planner ▶️ Entities:`, entities);

        // 5) Generate plan
        const distilledFacts = await this.distill.distill(preprocessed, candidates);
        const plan = await this.planner.plan(distilledFacts, preprocessed);
        console.log(`Planner ▶️ Plan:`, plan);

        // 6) Generate answer
        const answer = await this.answer.answer(
          preprocessed,
          distilledFacts,
          plan,
          candidates.map(c => c.js_code).filter(Boolean),
          candidates
        );

        // 7) Generate critique
        const critique = await this.critic.critique(preprocessed, answer, distilledFacts);
        console.log(`Planner ▶️ Critique:`, critique);

        // 8) Generate self-evaluation
        const selfEval = await this.meta.evaluate(answer, preprocessed);
        console.log(`Planner ▶️ Self-evaluation:`, selfEval);

        return {
          answer,
          entities,
          plan,
          candidates,
          filteredTokens,
          normalizedQuery: preprocessed,
          critique,
          selfEval
        };
      } catch (error) {
        console.error('Planner ❌ Error:', error);
        // Return a fallback response instead of throwing
        return {
          answer: "I apologize, but I'm having trouble processing your request. Could you please rephrase your question?",
          entities: [],
          plan: ["Analyze the query", "Provide a general response"],
          candidates: [],
          filteredTokens: [],
          normalizedQuery: query,
          critique: {
            confidence: 0.5,
            improve: "Unable to process request at this time."
          },
          selfEval: {
            confidence: 0.5,
            notes: "Using fallback response due to error."
          }
        };
      } finally {
        span.end();
      }
    });
  }
}

export const plannerAgent = new PlannerAgent();
