const BaseAgent = require('./BaseAgent');
const DocumentService = require('../services/document.service');
const WebSearchAgent = require('./WebSearchAgent');
const { getAgentDescription } = require('../config/agent.config');

class HRAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.domain = 'hr';
    this.webSearchAgent = new WebSearchAgent(config);
    this.description = getAgentDescription("HR");
  }

  async processQuery(query, context = {}) {
    try {
      console.log('HR Agent processing query:', query);
      
      // Use vector search to find relevant documents
      const relevantDocs = await DocumentService.similaritySearch(this.domain, query, 3);
      
      // Prepare document context
      let documentContext = '';
      if (relevantDocs.length > 0) {
        const sortedDocs = relevantDocs.sort((a, b) => 
          (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0)
        );
        documentContext = sortedDocs.map(doc => doc.pageContent).join('\n\n');
      }
      
      // Enhanced prompt with document context and focus on HR domain
      const prompt = `
        You are an HR specialist responding to a question about human resources matters.
        Your scope: ${this.description}

        QUESTION: "${query}"
        
        RELEVANT DOCUMENTATION:
        ${documentContext || 'No specific company policies available.'}
        
        Instructions:
        1. Look for ANY relevant HR information in the documentation that relates to the query
        2. If you find information about policies, benefits, or HR guidelines, include it in your response
        3. Only respond with "FALLBACK_TO_WEB_SEARCH" if there is absolutely no relevant HR information
        4. Even if the query mentions non-HR topics, focus on providing any HR-related information you can find
        
        Format your response to clearly separate different policy sections if multiple are relevant.
      `;
      
      // Generate response from the AI model
      console.log('Generating HR response with relevant document context...');
      const response = await this.generateResponse(prompt);
      
      // Check if we need to fall back to web search
      if (response.includes('FALLBACK_TO_WEB_SEARCH')) {
        console.log('Documentation does not contain specific information, falling back to web search...');
        return this.webSearchAgent.processQuery(query);
      }
      
      return response;
    } catch (error) {
      console.error('Error processing HR query:', error);
      // Fall back to web search on error
      console.log('Error in HR agent, falling back to web search...');
      return this.webSearchAgent.processQuery(query);
    }
  }
}

module.exports = HRAgent; 