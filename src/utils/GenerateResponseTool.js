const { Tool } = require('@langchain/core/tools');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

class GenerateResponseTool extends Tool {
  constructor(config = {}) {
    super({
        name: "generate response",
        description: "Generates a response from the model"
      });
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: 1024,
      },
    });
  }

 
  async _call(prompt) {
    try {
      
      if (!prompt || typeof prompt !== 'string') {
        return "Error: Empty or invalid prompt provided.";
      }
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating response:', error);
      return `Error generating response: ${error.message}`;
    }
  }
}

module.exports = GenerateResponseTool; 