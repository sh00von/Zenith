require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

// Standard RAG templates
const RAG_TEMPLATES = {
    datasetQuery: `
        Dataset Query:
        - Name: {name}
        - Type: {type}
        - Resolution: {resolution}
        - Time Range: {timeRange}
    `,
    regionQuery: `
        Region Query:
        - Level: {level}
        - Name: {name}
        - Type: {type}
        - Validation: {validation}
    `,
    processingQuery: `
        Processing Query:
        - Operation: {operation}
        - Inputs: {inputs}
        - Outputs: {outputs}
        - Validation: {validation}
    `
};

let knowledgeBase = null;

async function initialize() {
    try {
        console.log('Initializing RAG service...');
        knowledgeBase = await loadKnowledgeBase();
        if (!knowledgeBase) {
            throw new Error('Failed to load knowledge base');
        }
        console.log('RAG service initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing RAG service:', error);
        throw error;
    }
}

async function loadKnowledgeBase() {
    try {
        const knowledgeBasePath = path.join(__dirname, 'data.json');
        const data = await fs.readFile(knowledgeBasePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        return null;
    }
}

async function validateResponse(response) {
    if (!response || typeof response !== 'string') {
        throw new Error('Invalid response format');
    }
    
    // Check for common error patterns
    const errorPatterns = [
        'error',
        'invalid',
        'not found',
        'failed',
        'undefined'
    ];
    
    const hasError = errorPatterns.some(pattern => 
        response.toLowerCase().includes(pattern)
    );
    
    if (hasError) {
        throw new Error('Response contains error patterns');
    }
    
    return true;
}

async function ask(question) {
    try {
        if (!knowledgeBase) {
            await initialize();
        }

        const contextString = JSON.stringify(knowledgeBase, null, 2);
        
        const prompt = `
            You are an expert Google Earth Engine (GEE) assistant. Answer the question based on the KNOWLEDGE BASE.
            QUESTION: ${question}
            
            KNOWLEDGE BASE:
            \`\`\`json
            ${contextString}
            \`\`\`
            
            **Response Rules:**
            1. Accuracy:
               - Provide precise information
               - Include relevant details
               - Validate against knowledge base
               - Handle edge cases
            
            2. Format:
               - Use clear structure
               - Include examples
               - Add validation steps
               - Provide error handling
            
            3. Validation:
               - Check input validity
               - Verify output format
               - Handle missing data
               - Include error cases
            
            Generate a clear and accurate response.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        // Validate response
        await validateResponse(response);
        
        return response;
    } catch (error) {
        console.error('Error in RAG service:', error);
        return `Error: ${error.message}. Please try again with a more specific question.`;
    }
}

module.exports = { initialize, ask };