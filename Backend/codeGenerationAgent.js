// codeGenerationAgent.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ragService = require('./ragService');

const GEMINI_MODEL_NAME = "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

async function generateCode(queryAnalysis, selectedDatasets, preGeneratedCode) {
    console.log("Code Generation Agent: Generating code...");

    const { task, aoi, timeframe, details } = queryAnalysis;
    const datasetContext = selectedDatasets ? selectedDatasets.map(s => JSON.stringify(s.dataset, null, 2)).join('\n\n---\n\n') : "No datasets found.";

    const prompt = `
        You are an expert Google Earth Engine (GEE) programming assistant.
        **Task:** ${task}
        **AOI:** ${aoi || "Not specified. The user will provide a shapefile or FeatureCollection ID."}
        **Timeframe:** ${timeframe || "Not specified."}
        **Details:** ${details || "No further details provided."}
        **Datasets:**
        \`\`\`json
        ${datasetContext}
        \`\`\`

        **Code Generation Instructions:**
        1.  **Shapefile Import (FAO GAUL):**  If the user is asking for a location (e.g., Sylhet), use the FAO/GAUL_SIMPLIFIED_5M/2015 dataset.  Use the correct level (0 for countries, 1 for administrative regions (e.g., states, provinces), 2 for districts) and filter by the appropriate administrative unit (e.g., 'ADM1_NAME' for level 1, 'ADM2_NAME' for level 2). Make the filtering based on the plan and assumption.
        2.  **Clipping:** Always clip the final results to the user's Area of Interest (AOI) using ee.Image.clip(aoi).
        3.  **Placeholders:** Always include clear placeholders like /* TODO: Replace with your FeatureCollection ID */, or /* TODO: Replace with your AOI */ to highlight user-specific inputs.
        4.  **Clear Comments:**  Add explanatory comments.
        5.  **Data Scaling (if needed):** Ensure the output data is scaled correctly for viewing.

        Generate valid and executable GEE JavaScript code, using the context as a guideline.  Include comments to explain the purpose of each section of code. Provide only the code, do not include any explanation before or after the code. If there is any code that has already been generated, use it in the code generation or use it to create the code
    `
    try {
        const result = await model.generateContent(prompt);
        return { generatedCode: result.response.text(), plan: ["Generated Code"], assumptions: [] }; // Simplified for multi-agent
    } catch (error) {
        console.error("Error generating code:", error);
        return { generatedCode: "// Error generating code.", plan: ["Error"], assumptions: ["Error"] };
    }
}

module.exports = { generateCode };