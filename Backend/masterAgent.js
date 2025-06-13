// masterAgent.js
require('dotenv').config();
const queryUnderstandingAgent = require('./queryUnderstandingAgent');
const datasetDiscoveryAgent = require('./datasetDiscoveryAgent');
const codeGenerationAgent = require('./codeGenerationAgent');
const fs = require('fs');

async function processQuery(userQuery) {
    console.log(`Master Agent: Processing query: "${userQuery}"`);

    try {
        // 1. Query Understanding
        const queryAnalysis = await queryUnderstandingAgent.analyzeQuery(userQuery);
        console.log("Master Agent: Query Analysis:", queryAnalysis);

        // 2. Dataset Discovery
        const datasets = await datasetDiscoveryAgent.findDatasets(queryAnalysis);
        console.log("Master Agent: Discovered Datasets:", datasets);

        // 3. Code Generation
        const { generatedCode, plan, assumptions } = await codeGenerationAgent.generateCode(queryAnalysis, datasets);

        return {
            plan: plan,
            assumptions: assumptions,
            queryAnalysis: queryAnalysis,
            datasets: datasets,
            generatedCode: generatedCode
        };

    } catch (error) {
        console.error("Master Agent Error:", error);
        return {
            plan: ["An error occurred."],
            assumptions: ["An error occurred."],
            queryAnalysis: { query: userQuery, analysis: "Error" },
            datasets: [],
            generatedCode: "// An error occurred during processing."
        };
    }
}

module.exports = { processQuery };