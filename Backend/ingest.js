import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import 'dotenv/config';

// --- CONFIGURATION ---
const ALL_DATASETS_PATH = './data.json';
const OUTPUT_EMBEDDINGS_PATH = './dataset_embeddings.json';
const EMBEDDING_MODEL = 'text-embedding-004';

// --- CONFIGURATION FOR BATCHING ---
// The number of requests to run in parallel in a single batch.
// Keep this under your API's requests-per-minute limit (e.g., 60 RPM).
const BATCH_SIZE = 40;
// The time to wait between batches in milliseconds (e.g., 61 seconds for a 60 RPM limit).
const TIME_BETWEEN_BATCHES_MS = 100;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found. Make sure it's set in your .env file.");
}

function createDocumentText(dataset) {
    const classDescriptions = (dataset.classifications || [])
        .map(c => c.description)
        .slice(0, 5)
        .join(', ');
    return `Dataset EE Code: ${dataset.ee_code}; Provider: ${dataset.provider}; Description: ${dataset.description}; Classes: ${classDescriptions}`;
}

function createCodeExample(dataset) {
    // Create a comprehensive Earth Engine code example based on the dataset
    const isImageCollection = dataset.ee_code.includes('ImageCollection');
    const isFeatureCollection = dataset.ee_code.includes('FeatureCollection');
    
    let code = `// Example usage of ${dataset.ee_code}
// Load the dataset
var ${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')} = `;

    if (isImageCollection) {
        code += `ee.ImageCollection('${dataset.ee_code}')
    .filterDate('2023-01-01', '2023-12-31')
    .filterBounds(ee.Geometry.Point([0, 0]));  // Replace with your region of interest

// Get the first image for visualization
var image = ${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}.first();

// Add visualization parameters
var visParams = {
    min: 0,
    max: 1,
    palette: ['red', 'yellow', 'green']
};

// Display the image
Map.centerObject(image, 7);
Map.addLayer(image, visParams, '${dataset.ee_code.split('/').pop()}');

// Print image properties
print('Image properties:', image.propertyNames());
print('Available bands:', image.bandNames());`;
    } else if (isFeatureCollection) {
        code += `ee.FeatureCollection('${dataset.ee_code}')
    .filterBounds(ee.Geometry.Point([0, 0]));  // Replace with your region of interest

// Display the features
Map.centerObject(${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}, 7);
Map.addLayer(${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}, {}, '${dataset.ee_code.split('/').pop()}');

// Print feature properties
print('Feature properties:', ${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}.first().propertyNames());`;
    } else {
        code += `ee.Image('${dataset.ee_code}');

// Add visualization parameters
var visParams = {
    min: 0,
    max: 1,
    palette: ['red', 'yellow', 'green']
};

// Display the image
Map.centerObject(${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}, 7);
Map.addLayer(${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}, visParams, '${dataset.ee_code.split('/').pop()}');

// Print image properties
print('Image properties:', ${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}.propertyNames());
print('Available bands:', ${dataset.ee_code.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_')}.bandNames());`;
    }

    return code;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log(`Starting parallel ingestion process with a batch size of ${BATCH_SIZE}...`);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    console.log(`Using Gemini model: ${EMBEDDING_MODEL}`);

    if (!fs.existsSync(ALL_DATASETS_PATH)) {
        console.error(`ERROR: Dataset file not found at ${ALL_DATASETS_PATH}`);
        return;
    }
    const allDatasets = JSON.parse(fs.readFileSync(ALL_DATASETS_PATH, 'utf-8'));
    console.log(`Loaded ${allDatasets.length} datasets.`);

    const embeddingsList = [];
    const totalBatches = Math.ceil(allDatasets.length / BATCH_SIZE);

    // Main loop to process datasets in batches
    for (let i = 0; i < allDatasets.length; i += BATCH_SIZE) {
        const batchNumber = (i / BATCH_SIZE) + 1;
        const currentBatch = allDatasets.slice(i, i + BATCH_SIZE);
        console.log(`\n--- Processing Batch ${batchNumber} of ${totalBatches} (${currentBatch.length} items) ---`);

        // Create an array of promises for the current batch
        const promises = currentBatch.map(async (dataset) => {
            const documentText = createDocumentText(dataset);
            const jsCode = createCodeExample(dataset);
            try {
                const result = await model.embedContent(documentText);
                const embedding = result.embedding.values;
                console.log(`  ✅ Success: ${dataset.ee_code}`);
                return {
                    status: 'fulfilled',
                    value: {
                        ee_code: dataset.ee_code,
                        text: documentText,
                        embedding: embedding,
                        js_code: jsCode
                    }
                };
            } catch (error) {
                console.error(`  ❌ Failed to embed ${dataset.ee_code}:`, error.message);
                return { status: 'rejected', reason: error.message };
            }
        });

        // Wait for all promises in the batch to settle (either succeed or fail)
        const results = await Promise.allSettled(promises);

        // Process the results of the batch
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
                embeddingsList.push(result.value.value);
            }
        });
        
        // If it's not the last batch, wait to respect the rate limit
        if (batchNumber < totalBatches) {
            console.log(`--- Batch ${batchNumber} complete. Waiting for ${TIME_BETWEEN_BATCHES_MS / 1000} seconds... ---`);
            await sleep(TIME_BETWEEN_BATCHES_MS);
        }
    }
    
    fs.writeFileSync(OUTPUT_EMBEDDINGS_PATH, JSON.stringify(embeddingsList, null, 2));
    console.log('\n=====================================');
    console.log(`✅ Ingestion complete! Saved ${embeddingsList.length} embeddings to ${OUTPUT_EMBEDDINGS_PATH}.`);
    console.log('=====================================');
}

main().catch(console.error);