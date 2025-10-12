// what2watch-server/utils/geminiClient.js

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize the Gemini client once and export it for use in other files.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define safety settings that can be reused.
export const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// Export the main client instance
export default genAI;
