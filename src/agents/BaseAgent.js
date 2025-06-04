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

  async generateResponse(prompt, chatHistory = []) {
    try {
      // Format chat history if available
      // const formattedHistory = chatHistory.length > 0 
      //   ? '\nPrevious conversation:\n' + chatHistory.map(msg => 
      //       `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      //     ).join('\n')
      //   : '';

      // const fullPrompt = `${prompt}${formattedHistory}`;
      return await this.responseGenerator._call(prompt);
    } catch (error) {
      console.error('Error in BaseAgent.generateResponse:', error);
      return "Sorry, I couldn't generate a response at this time.";
    }
  }

  async processQuery(query, chatHistory = []) {
    // This method should be overridden by child classes
    throw new Error('processQuery method must be implemented by child classes');
  }
}

module.exports = BaseAgent; 