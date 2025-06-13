// datasetDiscoveryAgent.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');

const GEMINI_MODEL_NAME = "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

async function findDatasets(queryAnalysis) {
    console.log("Dataset Discovery Agent: Finding datasets...");
    const { task, aoi, timeframe } = queryAnalysis;

    // Load your knowledge base
    const rawData = fs.readFileSync('data.json');
    const knowledgeBase = JSON.parse(rawData);

    // --- STEP 1:  Identify Keywords ---
    let keywords = [];
    if (task) keywords.push(task);
    if (aoi) keywords.push(aoi);
    if (timeframe) keywords.push(timeframe);

    // --- STEP 2: Search the knowledge base ---
    let relevantDatasets = knowledgeBase.filter(dataset => {
        const datasetKeywords = dataset.keywords || [];
        return keywords.some(keyword => datasetKeywords.includes(keyword));
    });

    // --- STEP 3: If no datasets found, attempt a broader search using Google Dataset Search ---
    if (relevantDatasets.length === 0) {
        console.log("Dataset Discovery Agent: No direct matches found in knowledge base. Attempting broader search...");
        try {
            const searchQuery = `${task} ${aoi} ${timeframe} earth engine`;
            const googleDatasetSearchUrl = `https://earth-engine-api.appspot.com/api/datasets/search?q=${encodeURIComponent(searchQuery)}`;
            const response = await axios.get(googleDatasetSearchUrl);
            const searchResults = response.data.results;

            if (searchResults && searchResults.length > 0) {
                console.log(`Dataset Discovery Agent: Found ${searchResults.length} datasets via search.`);

                // Convert search results to a format consistent with the knowledge base
                relevantDatasets = searchResults.map(result => ({
                  dataset_name: result.title,
                  dataset_code: result.id, // Assuming the ID is the code
                  provider: result.providers ? result.providers.map(p => p.name).join(', ') : 'Unknown',
                  description_html: result.description,
                  task: task, // Use the task from query analysis
                  keywords: keywords // Use the keywords from analysis
                }));
            } else {
              console.log("Dataset Discovery Agent: No dataset found via search");
            }
        } catch (error) {
            console.error("Dataset Discovery Agent: Error during Google Dataset Search:", error);
        }
    } else {
        console.log("Dataset Discovery Agent: Found datasets in knowledge base.");
    }

    // --- STEP 4:  Return the found datasets (or an empty array) ---
    return relevantDatasets.map(dataset => ({
        datasetCode: dataset.dataset_code,
        justification: `Based on the task ${task}, this dataset is likely relevant.`,
        priority: 1, // All datasets have priority 1 to start
        dataset: dataset // Include the full dataset for the code generation
    }));
}

module.exports = { findDatasets };