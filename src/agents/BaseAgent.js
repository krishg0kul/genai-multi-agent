const GenerateResponseTool = require('../utils/GenerateResponseTool');
const dotenv = require('dotenv');
dotenv.config();

class BaseAgent {
  constructor(config) {
    this.config = config;
    this.responseGenerator = new GenerateResponseTool({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "gemini-1.5-flash",
      temperature: config?.llm?.temperature || 0.7
    });
  }

  async generateResponse(prompt) {
    try {
      return await this.responseGenerator._call(prompt);
    } catch (error) {
      console.error('Error in BaseAgent.generateResponse:', error);
      return "Sorry, I couldn't generate a response at this time.";
    }
  }

}

module.exports = BaseAgent; 