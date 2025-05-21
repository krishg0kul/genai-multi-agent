const { Tool } = require('@langchain/core/tools');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GenerateResponseTool extends Tool {
  constructor() {
    super({
        name: "generate response",
        description: "Generates a response from the model"
      });
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyAz5QPizZs3yeMEpm-7apKZw7mvFqVkTPQ');
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GOOGLE_MODEL_NAME || 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
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