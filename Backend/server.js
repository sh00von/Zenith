// server.js
import 'dotenv/config';
import express from 'express';
import { tracer } from './utils/tracer.js';
import { plannerAgent } from './plannerAgent.js';

const app = express();
app.use(express.json());

(async () => {
  try {
    await plannerAgent.initialize();
    console.log("Server ▶️ PlannerAgent initialized.");
  } catch (initErr) {
    console.error("Server ❌ Initialization failed:", initErr);
    process.exit(1);
  }

  app.post('/rag-query', (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    tracer.startActiveSpan('HTTP /rag-query', async span => {
      try {
        const result = await plannerAgent.processQuery(query);
        return res.json(result);

      } catch (err) {
        console.error("Server ❌ Error processing query:", err);
        if (!res.headersSent) {
          return res.status(500).json({ error: err.message });
        } else {
          res.write(`{"error":${JSON.stringify(err.message)}}`);
          return res.end();
        }
      } finally {
        span.end();
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server ▶️ listening on http://localhost:${PORT}`);
  });
})();
// Export the app for Vercel
export default app;