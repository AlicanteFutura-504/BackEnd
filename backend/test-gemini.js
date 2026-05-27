const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function run() {
  try {
    console.log("Key:", process.env.GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: 'Test system instruction' });
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage('Hola');
    const response = await result.response;
    console.log('Response:', response.text());
  } catch (err) {
    console.error('Error Details:', err);
  }
}

run();
