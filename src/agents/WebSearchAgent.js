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

  formatChatHistory(chatHistory) {
    if (!chatHistory || chatHistory.length === 0) return [];
    
    // Check if the history is in memory service format
    if (chatHistory[0].memory) {
      return chatHistory.map(item => ({
        role: 'assistant', // Since these are stored memories/responses
        content: item.memory
      }));
    }
    
    // If it's already in the expected format, return as is
    return chatHistory;
  }

  async detectQueryType(query, chatHistory = []) {
    // Check if it's a greeting
    const greetingPrompt = `
      Analyze if the following text is a greeting or introduction:
      "${query}"
      
      A greeting includes words like hello, hi, hey, greetings, etc.
      Respond with either "GREETING" or "NOT_GREETING".
      Keep your response to just one of these two words.
    `;
    
    const greetingResponse = await this.generateResponse(greetingPrompt);
    if (greetingResponse.trim().toUpperCase() === "GREETING") {
      return "GREETING";
    }

    // If we have chat history, check if it's a history-related query
    if (chatHistory.length > 0) {
      const historyCheckPrompt = `
        Analyze if the following query is asking about conversation history:
        "${query}"

        A history-related query could be:
        1. Questions about previous messages (e.g., "what was my last question?", "what did we discuss?")
        2. References to previous topics
        3. Requests to recall earlier parts of conversation
        4. Questions about what was previously said or asked

        Previous conversation:
        ${chatHistory.map((item, index) => 
          `[${index + 1}] ${item.memory || item.content}`
        ).join('\n')}

        Instructions:
        1. If the query is asking about conversation history, respond with "HISTORY"
        2. If it's a new/unrelated topic, respond with "NEW_TOPIC"
        3. Keep your response to just one of these two words
      `;

      const historyResponse = await this.generateResponse(historyCheckPrompt);
      if (historyResponse.trim().toUpperCase() === "HISTORY") {
        return "HISTORY";
      }
    }

    return "NEW_TOPIC";
  }

  async needsClarification(query, searchResults, chatHistory = []) {
    // Check if the query is ambiguous and might need clarification
    const clarificationCheckPrompt = `
      Analyze the following query and determine if it's ambiguous or needs clarification:
      
      Query: "${query}"
      
      Search Results: ${this.formatSearchResults(searchResults)}
      
      ${chatHistory.length > 0 ? 'Previous conversation context:\n' + chatHistory.map((item, index) => 
        `[${index + 1}] ${item.memory || item.content}`
      ).join('\n') : 'No previous conversation context available.'}
      
      Instructions:
      1. Determine if the query could refer to multiple different topics or concepts
      2. Check if the search results provide clear information for all possible interpretations
      3. Consider if asking a clarifying question would help provide a more accurate response
      
      Important guidelines:
      - Simple factual questions (e.g., "president of USA?", "capital of France?") should be considered CLEAR even if they could have multiple interpretations, as long as the search results provide relevant information
      - Only mark as NEEDS_CLARIFICATION if the query is genuinely ambiguous AND the search results don't provide enough context to give a helpful response
      - If the search results contain relevant information that answers the likely intent of the query, consider it CLEAR
      
      Respond with:
      - "NEEDS_CLARIFICATION" if the query is genuinely ambiguous and clarification would significantly improve the response
      - "CLEAR" if the query is specific enough or the search results cover the likely interpretations
      
      Keep your response to just one of these two options.
    `;
    
    const clarificationResult = await this.generateResponse(clarificationCheckPrompt);
    return clarificationResult.trim().toUpperCase() === "NEEDS_CLARIFICATION";
  }
  
  async generateClarifyingQuestion(query, searchResults, chatHistory = []) {
    // Generate a clarifying question based on the query and search results
    const clarifyingQuestionPrompt = `
      Generate a clarifying question for the following user query:
      
      Query: "${query}"
      
      Search Results: ${this.formatSearchResults(searchResults)}
      
      ${chatHistory.length > 0 ? 'Previous conversation context:\n' + chatHistory.map((item, index) => 
        `[${index + 1}] ${item.memory || item.content}`
      ).join('\n') : 'No previous conversation context available.'}
      
      Instructions:
      1. Identify the specific aspect of the query that needs clarification
      2. Formulate a clear, concise question that will help you better understand the user's intent
      3. If possible, offer options based on the search results
      4. Make the question conversational and helpful
      
      Your response should be ONLY the clarifying question, without any additional text.
    `;
    
    return await this.generateResponse(clarifyingQuestionPrompt);
  }

  async processQuery(query, chatHistory = []) {
    try {
    
      const queryType = await this.detectQueryType(query, chatHistory);
      
      if (queryType === "GREETING") {
        const greetingPrompt = `
          You are a friendly assistant. The user has greeted you with: "${query}"
          
          ${chatHistory.length > 0 ? 'Note: This is a returning user who has chatted before.' : ''}
          
          Respond with a warm, welcoming greeting and ask how you can help them today.
          Keep your response brief, friendly, and conversational.
          Make it feel like a natural conversation starter.
        `;
        
        return await this.generateResponse(greetingPrompt);
      }

      if (queryType === "HISTORY") {
        
        // Check if we need clarification about the history query
        const historyCheckPrompt = `
          Analyze the following query about conversation history and determine if it's ambiguous:
          
          Query: "${query}"
          
          Here is the conversation history in chronological order:
          ${chatHistory.map((item, index) => 
            `[${index + 1}] ${item.memory || item.content}`
          ).join('\n')}
          
          Instructions:
          1. Determine if the query could refer to multiple different aspects of the conversation history
          2. Consider if asking a clarifying question would help provide a more accurate response
          
          Respond with:
          - "NEEDS_CLARIFICATION" if the query is ambiguous and clarification would help
          - "CLEAR" if the query is specific enough
          
          Keep your response to just one of these two options.
        `;
        
        const historyNeedsClarification = await this.generateResponse(historyCheckPrompt);
        
        if (historyNeedsClarification.trim().toUpperCase() === "NEEDS_CLARIFICATION") {
          const historyClarifyingQuestionPrompt = `
            Generate a clarifying question for the following user query about conversation history:
            
            Query: "${query}"
            
            Here is the conversation history in chronological order:
            ${chatHistory.map((item, index) => 
              `[${index + 1}] ${item.memory || item.content}`
            ).join('\n')}
            
            Instructions:
            1. Identify the specific aspect of the query that needs clarification
            2. Formulate a clear, concise question that will help you better understand what part of the conversation history the user is interested in
            3. Make the question conversational and helpful
            
            Your response should be ONLY the clarifying question, without any additional text.
          `;
          
          return await this.generateResponse(historyClarifyingQuestionPrompt);
        }
        
        const historyResponsePrompt = `
          You are answering a query about the conversation history.
          
          Current query: "${query}"

          Here is the conversation history in chronological order:
          ${chatHistory.map((item, index) => 
            `[${index + 1}] ${item.memory || item.content}`
          ).join('\n')}
          
          Instructions:
          1. If asking about the last question/topic, look at the most recent entry
          2. If asking about specific topics, scan the history for relevant entries
          3. Be specific in referencing the history - quote the exact text when relevant
          4. If the history doesn't contain what's being asked about, say so clearly
          5. Keep the response focused on what's actually in the history
          6. Format the response naturally, as if having a conversation
        `;
          console.log('historyResponsePrompt', historyResponsePrompt);
        return await this.generateResponse(historyResponsePrompt);
      }

      // For new topics, proceed with web search
      const searchResults = await this.performWebSearch(query);
      
      // Check if the query needs clarification
      const needsClarification = await this.needsClarification(query, searchResults, chatHistory);
      
      if (needsClarification) {
        console.log('Query needs clarification, generating clarifying question');
        return await this.generateClarifyingQuestion(query, searchResults, chatHistory);
      }
      
      const searchContext = this.formatSearchResults(searchResults);

      const prompt = `
        You are a web search agent providing information from search results.
        
        ${chatHistory.length > 0 ? 'Previous Information:\n' + chatHistory.map((item, index) => 
          `${index + 1}. ${item.memory || item.content}`
        ).join('\n') : ''}
        
        CURRENT QUESTION: ${query}
        
        Search Results: ${searchContext}
        
        Instructions:
        1. Consider any relevant previous information when providing your response
        2. Provide a clear, helpful response based on these search results
        3. Always cite sources when providing information
        4. If the search results don't provide enough context, acknowledge the limitations
      `;
      
      return await this.generateResponse(prompt);
      
    } catch (error) {
      console.error('Error in Web Search agent:', error);
      return this.fallbackResponse(query, chatHistory);
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
  
  async fallbackResponse(query, chatHistory = []) {
    const prompt = `
      I apologize, but I'm having trouble accessing web search results at the moment.
      
      ${chatHistory.length > 0 ? 'Previous Information:\n' + chatHistory.map((item, index) => 
        `${index + 1}. ${item.memory || item.content}`
      ).join('\n') : ''}
      
      Based on my existing knowledge and our conversation history, please provide a helpful response about: ${query}
    `;
    
    try {
      return await this.generateResponse(prompt);
    } catch (error) {
      return "I apologize, but I'm having trouble providing a response at the moment.";
    }
  }
}

module.exports = WebSearchAgent;
