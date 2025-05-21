const GenerateResponseTool = require('../utils/GenerateResponseTool');

class BaseAgent {
  constructor(config) {
    this.config = config;
    
    this.responseGenerator = new GenerateResponseTool({
      apiKey: process.env.GOOGLE_API_KEY || 'AIzaSyAz5QPizZs3yeMEpm-7apKZw7mvFqVkTPQ',
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

  // Helper method to format prompt template with variables
  formatPrompt(template, variables) {
    let formattedPrompt = template;
    for (const [key, value] of Object.entries(variables)) {
      formattedPrompt = formattedPrompt.replace(`{${key}}`, value);
    }
    return formattedPrompt;
  }
}

module.exports = BaseAgent; 