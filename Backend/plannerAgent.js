// plannerAgent.js
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AzureOpenAI } from 'openai';
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

const EMB_PATH   = 'dataset_embeddings.json';
const EMB_MODEL  = 'text-embedding-004';
const GEN_MODEL  = 'gemini-2.0-flash-lite';

// Azure OpenAI config
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT || "https://todvob-ai.openai.azure.com/";
const AZURE_MODEL = process.env.AZURE_MODEL || "gpt-4o-mini";
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT || "gpt-4o-mini";
const AZURE_API_VERSION = process.env.AZURE_API_VERSION || "2024-04-01-preview";

// Model selection
const USE_AZURE = process.env.USE_AZURE === '1';

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

    // Initialize Gemini for all agents except answer
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embedModel = gemini.getGenerativeModel({ model: EMB_MODEL });
    this.geminiModel = gemini.getGenerativeModel({ model: GEN_MODEL });

    // Initialize Azure OpenAI only for answer agent
    const chatOptions = {
      endpoint: AZURE_ENDPOINT,
      apiKey: process.env.AZURE_API_KEY,
      deployment: AZURE_DEPLOYMENT,
      apiVersion: AZURE_API_VERSION
    };
    this.azureModel = new AzureOpenAI(chatOptions);

    // Unified methods for different agents
    this.generateContent = async (prompt, useAzure = false) => {
      if (useAzure) {
        const response = await this.azureModel.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4096,
          temperature: 1,
          top_p: 1,
          model: AZURE_MODEL
        });
        return response.choices[0].message.content;
      } else {
        const result = await this.geminiModel.generateContent(prompt);
        return result.response.text();
      }
    };

    this.embedContent = async (text) => {
      const result = await this.embedModel.embedContent(text);
      return result.embedding.values;
    };

    // instantiate agents with appropriate model selection
    this.pre = new PreprocessAgent(this);  // Uses Gemini
    this.attn = new AttentionAgent();
    this.intent = new IntentAgent(this);   // Uses Gemini
    this.search = new SearchAgent(this);   // Uses Gemini embeddings
    this.distill = new DistillAgent(this); // Uses Gemini
    this.planner = new PlanningAgent(this); // Uses Gemini
    this.answer = new AnswerAgent(this, true); // Uses Azure OpenAI
    this.critic = new CriticAgent(this);   // Uses Gemini
    this.meta = new MetacognitionAgent(this); // Uses Gemini
    this.memory = new MemoryAgent(EMB_PATH, this.embeddings, WRITE_MEMORY);

    console.log("Planner ▶️ all agents ready.");
  }

  async processQuery(query) {
    return tracer.startActiveSpan('PlannerAgent.processQuery', async span => {
      try {
        // 1) Preprocess - Uses Gemini
        const preprocessed = await this.pre.preprocess(query);
        console.log(`Planner ▶️ Preprocessed: "${preprocessed}"`);

        // 2) Get filtered tokens
        const filteredTokens = this.attn.filterTokens(preprocessed);
        console.log(`Planner ▶️ Filtered tokens:`, filteredTokens);

        // 3) Search for relevant datasets - Uses Gemini embeddings
        const searchResults = await this.search.search(preprocessed, this.embeddings);
        const candidates = searchResults.map(result => ({
          ee_code: result.ee_code,
          url: result.url,
          provider: result.provider,
          pixel_size: result.pixel_size,
          bands: result.bands,
          score: result.score
        }));

        // 4) Extract entities - Uses Gemini
        const entities = await this.intent.extract(preprocessed);
        console.log(`Planner ▶️ Entities:`, entities);

        // 5) Generate plan - Uses Gemini
        const distilledFacts = await this.distill.distill(preprocessed, candidates);
        const plan = await this.planner.plan(distilledFacts, preprocessed);
        console.log(`Planner ▶️ Plan:`, plan);

        // 6) Generate answer - Uses Azure OpenAI
        const answer = await this.answer.answer(
          preprocessed,
          distilledFacts,
          plan,
          candidates.map(c => c.js_code).filter(Boolean),
          candidates
        );

        // 7) Generate critique - Uses Gemini
        const critique = await this.critic.critique(preprocessed, answer, distilledFacts);
        console.log(`Planner ▶️ Critique:`, critique);

        // 8) Generate self-evaluation - Uses Gemini
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
