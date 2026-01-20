import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return;
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
        const apiKey = match[1].trim();

        const genAI = new GoogleGenerativeAI(apiKey);
        // Not directly exposed via helper, but we need to check docs or guess?
        // Actually, SDK doesn't have listModels on the main class easily in some versions.
        // Use raw fetch for listing.

        console.log("Listing models via Fetch...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
