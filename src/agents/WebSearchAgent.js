const BaseAgent = require('./BaseAgent');
const { SerpAPI } = require('@langchain/community/tools/serpapi');
const dotenv = require('dotenv');
dotenv.config();

class WebSearchAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.serpApiTool = new SerpAPI(
      process.env.SERPAPI_API_KEY,
    );
  }

  async processQuery(query) {
    try {
      
      const greetingPrompt = `
        Analyze if the following text is a greeting or introduction:
        "${query}"
        
        A greeting includes words like hello, hi, hey, greetings, etc.
        Respond with either "GREETING" or "NOT_GREETING".
        Keep your response to just one of these two words.
      `;
      
      const greetingResponse = await this.generateResponse(greetingPrompt);
      
      if (greetingResponse.trim().toUpperCase() === "GREETING") {
        const greetingResponsePrompt = `
          You are a friendly assistant. The user has greeted you with: "${query}"
          
          Respond with a warm, welcoming greeting and ask how you can help them today.
          Keep your response brief, friendly, and conversational.
          Make it feel like a natural conversation starter.
        `;
        
        return await this.generateResponse(greetingResponsePrompt);
      }

      // Perform search and generate response
      const searchResults = await this.performWebSearch(query);
      const searchContext = this.formatSearchResults(searchResults);

      const prompt = `
        You are a web search agent providing information from search results.
        
        Search Results: ${searchContext}
        
        User question: ${query}
        
        Provide a clear, helpful response based on these search results.
        Always cite sources when providing information.
        If the search results don't provide enough context, acknowledge the limitations.
      `;
      
      return await this.generateResponse(prompt);
      
    } catch (error) {
      console.error('Error in Web Search agent:', error);
      return this.fallbackResponse(query);
    }
  }

  formatSearchResults(results) {
    if (!results || results.length === 0) {
      return 'No search results available.';
    }
    
    // Format each result and join with line breaks
    return results
      .map((result, index) => {
        const title = result.title || 'No title';
        const snippet = result.snippet || result.source || result.date || 'No description available';
        const link = result.link || '#';
        return `[${index + 1}] "${title}"\n${snippet}\nSource: ${link}`;
      })
      .join('\n\n');
  }

  async performWebSearch(query) {
    try {
      console.log(`Searching with SerpAPI: ${query}`);
      const searchResponse = await this.serpApiTool.invoke(query);
      return this.parseSearchResults(searchResponse, query);
    } catch (error) {
      console.error('SerpAPI search error:', error);
      return [];
    }
  }

  parseSearchResults(searchResponse, query) {
    
    try {
      let results = searchResponse;
      if (typeof searchResponse === 'string') {
        try {
          results = JSON.parse(searchResponse);
        } catch (e) {
          // If parsing fails, wrap the string in a single result
          return [{
            title: `Search Result for "${query}"`,
            link: 'https://serpapi.com',
            snippet: searchResponse
          }];
        }
      }
      
      // Process array results
      if (Array.isArray(results)) {
        return results.map(result => ({
          title: result.title || `Result for "${query}"`,
          link: result.link || '#',
          snippet: result.snippet || result.source || result.date || 'No description available'
        }));
      }
      
      // Handle non-array results
      return [{
        title: `Search Result for "${query}"`,
        link: 'https://serpapi.com',
        snippet: typeof results === 'object' ? JSON.stringify(results) : String(results)
      }];
    } catch (error) {
      console.error('Error parsing search results:', error);
      return [{
        title: 'Search Results',
        link: 'N/A',
        snippet: 'No results available'
      }];
    }
  }
  
  async fallbackResponse(query) {
    const prompt = `
      I apologize, but I'm having trouble accessing web search results at the moment.
      Based on my existing knowledge, please provide a helpful response about: ${query}
    `;
    
    try {
      return await this.generateResponse(prompt);
    } catch (error) {
      return "I apologize, but I'm having trouble providing a response at the moment.";
    }
  }
}

module.exports = WebSearchAgent;