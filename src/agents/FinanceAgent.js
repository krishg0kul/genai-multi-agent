const BaseAgent = require('./BaseAgent');
const DocumentService = require('../services/document.service');
const WebSearchAgent = require('./WebSearchAgent');

class FinanceAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.domain = 'finance';
    this.webSearchAgent = new WebSearchAgent(config);
  }

  async processQuery(query, context = {}) {
    try {
      console.log('Finance Agent processing query:', query);
      
      // Use vector search to find relevant documents
      const relevantDocs = await DocumentService.similaritySearch(this.domain, query, 3);
      
      let documentContext = '';
      if (relevantDocs.length > 0) {
        documentContext = relevantDocs.map(doc => doc.pageContent).join('\n\n');
      }
      
      // Enhanced prompt with document context
      const prompt = `
        You are a Finance professional responding to the following financial question:
        
        QUESTION: ${query}
        
        ${documentContext ? `RELEVANT DOCUMENTATION:\n${documentContext}` : 'No specific financial policies available.'}
        
        First, check if the documentation contains specific information to answer the question.
        If the documentation does not contain the specific information needed, respond with "FALLBACK_TO_WEB_SEARCH".
        If the documentation contains relevant information, provide a clear, accurate response.
        Reference specific financial policies when applicable.
        
        Keep your answer concise and directly address the question asked.
      `;
      
      // Generate response from the AI model
      console.log('Generating Finance response with relevant document context...');
      const response = await this.generateResponse(prompt);
      
      // Check if we need to fall back to web search
      if (response.includes('FALLBACK_TO_WEB_SEARCH')) {
        console.log('Documentation does not contain specific information, falling back to web search...');
        return this.webSearchAgent.processQuery(query);
      }
      
      return response;
    } catch (error) {
      console.error('Error processing Finance query:', error);
      console.log('Error in Finance agent, falling back to web search...');
      return this.webSearchAgent.processQuery(query);
    }
  }
}

module.exports = FinanceAgent; 