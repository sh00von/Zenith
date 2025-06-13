// server.js
import 'dotenv/config';
import express from 'express';
import { plannerAgent } from './plannerAgent.js';

const PORT = 3000;
const app  = express();

app.use(express.json());

(async () => {
  try {
    await plannerAgent.initialize();
    console.log("Server ▶️ PlannerAgent initialized.");

    app.post('/rag-query', async (req, res) => {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
      }
      try {
        const result = await plannerAgent.processQuery(query);
        res.json(result);
      } catch (e) {
        console.error("Server ❌ Error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server ▶️ Listening on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("Server ❌ Initialization failed:", e);
    process.exit(1);
  }
})();
