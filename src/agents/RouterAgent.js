const BaseAgent = require('./BaseAgent');

class RouterAgent extends BaseAgent {
  constructor(config) {
    super(config);
  }

  async decideAgent(query) {
    this.agentDescriptions = [
      {
        name: "IT",
        description: "IT Agent: For technical issues, software problems, computer questions, IT infrastructure, technical support"
      },
      {
        name: "HR",
        description: "HR Agent: For employee policies, benefits, workplace issues, hiring, training, employee relations"
      },
      {
        name: "FINANCE",
        description: "Finance Agent: For budget questions, expenses, financial reports, accounting, investments, financial planning"
      },
      {
        name: "WEB_SEARCH",
        description: "Web Search Agent: For general information, facts, current events, or anything not fitting the other categories"
      }
    ];

    try {
      // AI to choose the most appropriate agent
      const agentOptions = this.agentDescriptions.map(agent => agent.description).join("\n");
      
      const prompt = `
        You are a router agent that determines which specialized agent should handle a user query.
        
        USER QUERY: "${query}"
        
        AVAILABLE AGENTS:
        ${agentOptions}
        
        Think carefully about which agent would be best suited to handle this query.
        Consider the topic, required expertise, and specific domain knowledge needed.
        
        INSTRUCTIONS:
        1. Analyze the query to understand its domain and required expertise
        2. Choose the most appropriate agent from the list above
        3. Respond ONLY with the agent name (IT, HR, FINANCE, or WEB_SEARCH)
        4. Do not add any additional text or explanation
      `;
      
      const response = await this.generateResponse(prompt);
      
      let decidedAgent = this.extractAgentName(response); // extract the agent name from the response

      const reasoningPrompt = `
        You are a router agent that has decided to route this query:
        "${query}"
        
        to the ${decidedAgent} Agent.
        
        Please provide a brief explanation of why this is the appropriate agent.
        Keep your explanation under 50 words.
      `;
      
      const reasoning = await this.generateResponse(reasoningPrompt);
      
      console.log(`Routing decision: ${decidedAgent} - Reason: ${reasoning}`);
      
      return {
        agent: decidedAgent,
        reasoning: reasoning
      };
    } catch (error) {
      console.error('Error in router agent:', error);
      return {
        agent: 'WEB_SEARCH',
        reasoning: 'Error occurred while deciding agent, falling back to web search.'
      };
    }
  }
  
  extractAgentName(response) {
    const cleanResponse = response.trim();
    const validAgents = ["IT", "HR", "FINANCE", "WEB_SEARCH"];
    
    for (const agent of validAgents) {
      if (cleanResponse.includes(agent)) {
        return agent;
      }
    }
    
    // if partial matches
    if (cleanResponse.toUpperCase().includes("IT")) return "IT";
    if (cleanResponse.toUpperCase().includes("HR")) return "HR";
    if (cleanResponse.toUpperCase().includes("FINANCE")) return "FINANCE";
    if (cleanResponse.toUpperCase().includes("WEB") || 
        cleanResponse.toUpperCase().includes("SEARCH")) return "WEB_SEARCH";
    
    return "WEB_SEARCH";
  }
}

module.exports = RouterAgent; 