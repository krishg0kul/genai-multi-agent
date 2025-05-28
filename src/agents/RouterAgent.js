const BaseAgent = require('./BaseAgent');
const { AGENT_WITH_DESCRIPTIONS } = require('../config/agent.config');

class RouterAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.agentDescriptions = AGENT_WITH_DESCRIPTIONS;
  }

  async decideAgent(query) {
    try {
      const agentOptions = this.agentDescriptions.map(agent => agent.description).join("\n");
      
      const prompt = `
        You are a router agent that determines which specialized agent(s) should handle a user query.
        You can select multiple agents if the query requires expertise from different domains.
        
        USER QUERY: "${query}"
        
        AVAILABLE AGENTS:
        ${agentOptions}
        
        Think carefully about which agent(s) would be best suited to handle this query.
        Consider:
        1. The primary domain of the query
        2. Any secondary or related domains that might provide valuable input
        3. Whether multiple perspectives would give a more complete answer
        
        INSTRUCTIONS:
        1. Analyze the query to understand all required domains of expertise
        2. Choose one or more appropriate agents from the list above
        3. List the agents in order of relevance/importance
        4. Respond with ONLY the agent names, separated by commas (e.g., "IT, HR" or "FINANCE" or "IT, FINANCE, WEB_SEARCH")
        5. Do not add any additional text or explanation
      `;
      
      const response = await this.generateResponse(prompt);
      const decidedAgents = this.extractAgentNames(response);

      // Get reasoning for the choices
      const reasoningPrompt = `
        You are a router agent that has decided to route this query:
        "${query}"

        Available agents descriptions : ${agentOptions}

        to the following agent(s): ${decidedAgents.join(", ")}
        
        Please provide a brief explanation of why these agents are appropriate.
        If multiple agents were chosen, explain why the combination is beneficial.
        Keep your explanation under 100 words.
      `;
      
      const reasoning = await this.generateResponse(reasoningPrompt);
      
      console.log(`Routing decision: ${decidedAgents.join(", ")} - Reason: ${reasoning}`);
      
      return {
        agents: decidedAgents,
        reasoning: reasoning
      };
    } catch (error) {
      console.error('Error in router agent:', error);
      return {
        agents: ['WEB_SEARCH'],
        reasoning: 'Error occurred while deciding agents, falling back to web search.'
      };
    }
  }
  
  extractAgentNames(response) {
    const cleanResponse = response.trim().toUpperCase();
    const validAgents = this.agentDescriptions.map(agent => agent.name);
    const selectedAgents = new Set();
    
    // Split by common delimiters and clean up
    const potentialAgents = cleanResponse.split(/[,;\n\s]+/);
    
    for (const potentialAgent of potentialAgents) {
      // Check for exact matches first
      if (validAgents.includes(potentialAgent)) {
        selectedAgents.add(potentialAgent);
        continue;
      }
      
      // Check for partial matches
      if (potentialAgent.includes("IT")) selectedAgents.add("IT");
      if (potentialAgent.includes("HR")) selectedAgents.add("HR");
      if (potentialAgent.includes("FINANCE")) selectedAgents.add("FINANCE");
      if (potentialAgent.includes("WEB") || potentialAgent.includes("SEARCH")) {
        selectedAgents.add("WEB_SEARCH");
      }
    }
    
    // If no agents were selected, fall back to WEB_SEARCH
    if (selectedAgents.size === 0) {
      selectedAgents.add("WEB_SEARCH");
    }
    
    return Array.from(selectedAgents);
  }
}

module.exports = RouterAgent; 