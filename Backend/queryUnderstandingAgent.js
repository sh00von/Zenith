// queryUnderstandingAgent.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_MODEL_NAME = "gemini-2.0-flash"; // Or your preferred model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

async function analyzeQuery(query) {
    console.log("Query Understanding Agent: Analyzing query...");

    const prompt = `
        You are a Google Earth Engine (GEE) query analyzer.  Your job is to extract key information from a user's request.

        Follow these steps:
        1.  Determine the task.  What is the user trying to achieve? (e.g., flood mapping, NDVI calculation, land cover classification).
        2.  Identify the Area of Interest (AOI).  Is the user requesting a specific location? (e.g., Sylhet, Bangladesh). If a location is mentioned, note it.
        3.  Determine the time frame. If the user specifies a date or a time period, note it.
        4.  If an AOI is mentioned, state:  "The user will need to provide the shapefile or the FeatureCollection ID."
        5.  If the query requests FAO GAUL data, include the level information (Level 0 for countries, Level 1 for administrative regions (e.g., states, provinces), Level 2 for districts).

        **USER QUERY:**
        ${query}

        **YOUR RESPONSE (must be a valid JSON object):**
        Provide your final answer in a single, clean JSON object with four keys: "task", "aoi", "timeframe", and "details". Do not include any text outside of this JSON object.

        Example JSON format (for flood mapping in Sylhet in 2020):
        {
          "task": "flood mapping",
          "aoi": "Sylhet",
          "timeframe": "2020",
          "details": "The user will need to provide the shapefile or the FeatureCollection ID."
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJsonString);
    } catch (error) {
        console.error("Error in Query Understanding Agent:", error);
        return {
            task: "unknown",
            aoi: null,
            timeframe: null,
            details: "Could not understand the query."
        };
    }
}

module.exports = { analyzeQuery };