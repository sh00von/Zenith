const express = require('express');
const ragService = require('./ragService');
const masterAgent = require('./masterAgent'); // Now we use the master agent
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(express.json());

// ... (Keep the /ask endpoint, for now, if you want to retain simple Q&A) ...
app.post('/ask', async (req, res) => {
    try {
        // (Same as before, if you want to retain simple Q&A)
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Please provide a "query".' });
        const answer = await ragService.ask(query);
        res.status(200).json({ answer: answer.trim() });
    } catch (error) {
        console.error("Error in /ask endpoint:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Endpoint for the advanced planner and code generator
app.post('/plan-and-code', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Please provide a "query".' });

        const result = await masterAgent.processQuery(query); // Call the master agent

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in /plan-and-code endpoint:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

async function startServer() {
    try {
        await ragService.initialize();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log("Agent is ready. Use POST /ask or POST /plan-and-code.");
        });
    } catch (error) {
        console.error("Failed to start the server:", error);
        process.exit(1);
    }
}

startServer();