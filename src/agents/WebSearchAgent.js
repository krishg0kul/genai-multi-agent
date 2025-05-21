const BaseAgent = require('./BaseAgent');
const fetch = require('node-fetch');

class WebSearchAgent extends BaseAgent {
  constructor(config) {
    super(config);

    this.queryPrompt = `
      You are a web search agent responsible for finding information when other specialized agents cannot help.
      Use the following search results to answer the user's question:
      
      Search Results: {context}
      
      User question: {query}
      
      Provide a clear and helpful response based on the search results.
      Always cite sources when providing information.
      If the search results don't provide enough context, acknowledge the limitations.
    `;
    
    // SerpAPI settings
    this.serpApiKey = process.env.SERPAPI_API_KEY || 'ff25a21622445954cb63bc0676a44839ab8582489598b559588dde133c48d273';
  }

  async initialize() {
    // No specific initialization needed for web search agent
    return Promise.resolve();
  }

  async processQuery(query, context = {}) {
    try {
      // Check if the query is a greeting
      const greetingPrompt = `
        Analyze if the following text is a greeting or introduction:
        "${query}"
        
        Respond with either "GREETING" or "NOT_GREETING".
        A greeting includes words like hello, hi, hey, greetings, etc.
        Keep your response to just one of these two words.
      `;
      
      const greetingResponse = await this.generateResponse(greetingPrompt);
      
      if (greetingResponse.trim().toUpperCase() === "GREETING") {
        // Generate a friendly greeting response
        const greetingResponsePrompt = `
          You are a friendly assistant. The user has greeted you with: "${query}"
          
          Respond with a warm, welcoming greeting and ask how you can help them today.
          Keep your response brief, friendly, and conversational.
          Make it feel like a natural conversation starter.
        `;
        
        return await this.generateResponse(greetingResponsePrompt);
      }

      // If not a greeting, proceed with web search
      const searchResults = await this.performWebSearch(query);
      
      // Format search results for prompt
      let searchContext;
      if (searchResults && searchResults.length > 0) {
        searchContext = searchResults.map((result, index) => 
          `[${index + 1}] "${result.title}"\n${result.snippet}\nSource: ${result.link}`
        ).join('\n\n');
      } else {
        searchContext = 'No search results available. The search API may be unavailable or the query returned no results.';
      }

      // Generate response
      const response = await this.generateResponse(
        this.formatPrompt(this.queryPrompt, {
          context: searchContext,
          query: query
        })
      );

      return response;
    } catch (error) {
      console.error('Error in Web Search agent:', error);
      
      // Fallback response when search fails
      const fallbackResponse = await this.generateResponse(
        `I apologize, but I'm having trouble accessing web search results at the moment. 
        Based on my existing knowledge: ${query}`
      );
      
      return fallbackResponse;
    }
  }

  async performWebSearch(query) {
    try {
      // If no API key is provided, use a fallback method
      if (!this.serpApiKey) {
        console.warn('No SerpAPI key provided. Using fallback method.');
        return this.fallbackSearch(query);
      }
      
      // Encode query properly
      const encodedQuery = encodeURIComponent(query);
      
      // Make API request to SerpAPI
      const url = `https://serpapi.com/search.json?q=${encodedQuery}&api_key=${this.serpApiKey}&engine=google`;
      
      console.log(`Searching with SerpAPI: ${query}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`SerpAPI returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Format results from SerpAPI structure
      if (data && data.organic_results) {
        return data.organic_results.map(result => ({
          title: result.title,
          link: result.link,
          snippet: result.snippet || 'No description available'
        })).slice(0, 5); // Limit to 5 results
      } else if (data && data.error) {
        throw new Error(`SerpAPI error: ${data.error}`);
      }
      
      return [];
    } catch (error) {
      console.error('Web search error:', error);
      return this.fallbackSearch(query);
    }
  }
  
  async fallbackSearch(query) {
    console.log('Using fallback search for query:', query);
    
    // Direct response prompt when search is unavailable
    const fallbackPrompt = `
      You are a helpful assistant. The user has asked: "${query}"
      
      Since I cannot perform a web search at the moment, please provide a helpful response based on your knowledge.
      If you're not confident about the information, please acknowledge the limitations.
      Be clear that this is based on general knowledge rather than current web search results.
      
      Keep your response factual, concise, and directly relevant to the query.
    `;
    
    try {
      const response = await this.generateResponse(fallbackPrompt);
      return [{
        title: 'Direct Response',
        link: 'N/A',
        snippet: response
      }];
    } catch (error) {
      console.error('Fallback response error:', error);
      return [{
        title: 'Error',
        link: 'N/A',
        snippet: "I apologize, but I'm having trouble providing a response at the moment. Please try again later."
      }];
    }
  }
}

module.exports = WebSearchAgent; 