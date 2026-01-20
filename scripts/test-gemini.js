import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-pro",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest"
];

async function runTest() {
    try {
        // 1. Read .env.local
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error("❌ .env.local file not found.");
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);

        if (!match || !match[1]) {
            console.error("❌ VITE_GEMINI_API_KEY not found in .env.local");
            return;
        }

        const apiKey = match[1].trim();
        if (!apiKey || apiKey === "your_api_key_here") {
            console.error("❌ API Key is empty or placeholder.");
            return;
        }

        console.log(`Checking API Key: ${apiKey.slice(0, 4)}... (Hidden)`);
        const genAI = new GoogleGenerativeAI(apiKey);

        let successModel = null;

        for (const modelName of MODELS_TO_TRY) {
            console.log(`\nTesting model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, strictly answer with 'OK'.");
                const response = await result.response;
                const text = response.text();

                console.log(`✅ Success with ${modelName}! Response: ${text.trim()}`);
                successModel = modelName;
                break;
            } catch (error) {
                console.log(`❌ Failed ${modelName}: ${error.message.split(']')[1] || error.message}`);
            }
        }

        if (successModel) {
            console.log(`\n🎉 WORKING MODEL FOUND: ${successModel}`);
            console.log(`Please update src/lib/gemini.js to use "${successModel}" if it's different.`);
        } else {
            console.error("\n❌ All models failed. Please check your API Key permissions.");
        }

    } catch (error) {
        console.error("❌ Script Error:", error.message);
    }
}

runTest();
