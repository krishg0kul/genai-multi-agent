const BaseAgent = require('./BaseAgent');
const DocumentService = require('../services/document.service');
const WebSearchAgent = require('./WebSearchAgent');
const { getAgentDescription } = require('../config/agent.config');

class FinanceAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.domain = 'finance';
    this.webSearchAgent = new WebSearchAgent(config);
    this.description = getAgentDescription("FINANCE");
  }

  async processQuery(query, context = {}) {
    try {
      console.log('Finance Agent processing query:', query);
      
      // Use vector search to find relevant documents
      const relevantDocs = await DocumentService.similaritySearch(this.domain, query, 3);
      
      let documentContext = '';
      if (relevantDocs.length > 0) {
        const sortedDocs = relevantDocs.sort((a, b) => 
          (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0)
        );
        documentContext = sortedDocs.map(doc => doc.pageContent).join('\n\n');
      }
      
      // Enhanced prompt with document context
      const prompt = `
        You are a Finance professional responding to a question about financial matters.
        Your scope: ${this.description}
        
        QUESTION: "${query}"
        
        RELEVANT DOCUMENTATION:
        ${documentContext || 'No specific financial policies available.'}
        
        Instructions:
        1. Look for ANY relevant financial information in the documentation that relates to the query
        2. If you find information about reimbursement, expenses, or financial policies, include it in your response
        3. If you find the "Non-Reimbursable Items" section, make sure to list those items
        4. Only respond with "FALLBACK_TO_WEB_SEARCH" if there is absolutely no relevant financial information
        5. Even if the query mentions non-financial topics, focus on providing any financial-related information you can find
        
        Format your response to clearly separate different policy sections if multiple are relevant.
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