const BaseAgent = require('./BaseAgent');
const { AGENT_WITH_DESCRIPTIONS } = require('../config/agent.config');

class RouterAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.agentDescriptions = AGENT_WITH_DESCRIPTIONS;
  }

  async decideAgent(query, chatHistory = []) {
    try {
      
      const agentOptions = this.agentDescriptions.map(agent => agent.description).join("\n");
      
      // Format chat history
      const formattedHistory = chatHistory.length > 0 
        ? chatHistory.map(item => 
            item.memory ? `- ${item.memory}` : item.content
          ).join('\n')
        : '';
      
      const prompt = `
        You are a router agent that determines which specialized agent(s) should handle a user query.
        You can select multiple agents if the query requires expertise from different domains.
        
        Previous Chat Information: ${formattedHistory}
        
        CURRENT QUERY: "${query}"
        
        AVAILABLE AGENTS:
        ${agentOptions}
        
        Think carefully about which agent(s) would be best suited to handle this query.
        Consider:
        1. The primary domain of the query
        2. Any secondary or related domains that might provide valuable input
        3. Whether multiple perspectives would give a more complete answer
        4. The context from previous conversation, if any
        5. If this appears to be a follow-up to a previous question, consider routing to the same agent
        
        INSTRUCTIONS:
        1. Analyze the query and conversation history to understand all required domains of expertise
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

        Previous Chat Information: ${formattedHistory}

        Available agents descriptions: ${agentOptions}

        to the following agent(s): ${decidedAgents.join(", ")}
        
        Please provide a brief explanation of why these agents are appropriate.
        Consider both the current query and any relevant context from previous conversation.
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
      
      // Check for partial matches - but only if they're standalone words
      // This prevents matching "IT" in words like "BENEFITS" or "SECURITY"
      if (potentialAgent === "IT") selectedAgents.add("IT");
      if (potentialAgent === "HR") selectedAgents.add("HR");
      if (potentialAgent === "FINANCE") selectedAgents.add("FINANCE");
      if (potentialAgent === "WEB" || potentialAgent === "SEARCH" || potentialAgent === "WEB_SEARCH") {
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
