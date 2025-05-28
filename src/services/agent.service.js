const { Graph, END } = require('@langchain/langgraph');
const RouterAgent = require('../agents/RouterAgent');
const ITAgent = require('../agents/ITAgent');
const HRAgent = require('../agents/HRAgent');
const FinanceAgent = require('../agents/FinanceAgent');
const WebSearchAgent = require('../agents/WebSearchAgent');
const DocumentService = require('./document.service');
const { getAgentDescription } = require('../config/agent.config');

class AgentService {
  constructor() {
    this.config = {
      llm: {
        temperature: 0.7,
      }
    };

    // Create all our agent instances
    this.router = new RouterAgent(this.config);
    this.IT = new ITAgent(this.config);
    this.HR = new HRAgent(this.config);
    this.FINANCE = new FinanceAgent(this.config);
    this.WEB_SEARCH = new WebSearchAgent(this.config);

    // The workflow graph
    this.graph = null;
  }

  async initialize() {
    try {
      await DocumentService.initAllVectorStores();
      this.graph = await this.createWorkflowGraph();
    } catch (error) {
      console.error('Error initializing agent system:', error);
      throw error;
    }
  }

  async cleanAgentResponse(agentName, response) {
    const prompt = `
    As the ${agentName} agent with the following role: ${getAgentDescription(agentName)}

    Please clean and reformat the following response to:
    1. Include ONLY information specific to your domain
    2. Remove any mentions of other departments or their responsibilities
    3. Remove statements about missing information or referrals
    4. Keep only factual, relevant information from your domain
    5. Maintain a professional, direct tone

    Response to clean:
    ${response}`;

    try {
      const agent = this[agentName];
      if (!agent) return response;
      return await agent.generateResponse(prompt);
    } catch (error) {
      console.error('Error cleaning agent response:', error);
      return response;
    }
  }

  async createWorkflowGraph() {
    const graph = new Graph();

    const routerNode = async (state) => {
      const routingResult = await this.router.decideAgent(state.query);
      console.log('Router decided to use agents:', routingResult.agents);
      return {
        ...state,
        agents: routingResult.agents,
        reasoning: routingResult.reasoning,
        responses: {},
        processedAgents: []
      };
    };

    const itNode = async (state) => {
      const response = await this.IT.processQuery(state.query);
      const cleanedResponse = await this.cleanAgentResponse('IT', response);
      return {
        ...state,
        responses: { ...state.responses, IT: cleanedResponse },
        processedAgents: [...state.processedAgents, 'IT']
      };
    };

    const hrNode = async (state) => {
      const response = await this.HR.processQuery(state.query);
      const cleanedResponse = await this.cleanAgentResponse('HR', response);
      return {
        ...state,
        responses: { ...state.responses, HR: cleanedResponse },
        processedAgents: [...state.processedAgents, 'HR']
      };
    };

    const financeNode = async (state) => {
      const response = await this.FINANCE.processQuery(state.query);
      const cleanedResponse = await this.cleanAgentResponse('FINANCE', response);
      return {
        ...state,
        responses: { ...state.responses, FINANCE: cleanedResponse },
        processedAgents: [...state.processedAgents, 'FINANCE']
      };
    };

    const webSearchNode = async (state) => {
      const response = await this.WEB_SEARCH.processQuery(state.query);
      const cleanedResponse = await this.cleanAgentResponse('WEB_SEARCH', response);
      return {
        ...state,
        responses: { ...state.responses, WEB_SEARCH: cleanedResponse },
        processedAgents: [...state.processedAgents, 'WEB_SEARCH']
      };
    };

    const routeToAgents = (state) => {
      const remainingAgents = state.agents.filter(
        agent => !state.processedAgents.includes(agent)
      );

      // If no remaining agents, end the workflow
      if (remainingAgents.length === 0) {
        console.log('All agents have processed the query. Ending workflow.');
        return END;
      }

      // Return next agent to process
      const nextAgent = remainingAgents[0];

      switch (nextAgent) {
        case 'IT':
          return 'it';
        case 'HR':
          return 'hr';
        case 'FINANCE':
          return 'finance';
        case 'WEB_SEARCH':
        default:
          return 'websearch';
      }
    };

    // Add all nodes to the graph
    graph.addNode("router", routerNode);
    graph.addNode("it", itNode);
    graph.addNode("hr", hrNode);
    graph.addNode("finance", financeNode);
    graph.addNode("websearch", webSearchNode);

    // Add edges
    graph.addConditionalEdges("router", routeToAgents);
    graph.addConditionalEdges("it", routeToAgents);
    graph.addConditionalEdges("hr", routeToAgents);
    graph.addConditionalEdges("finance", routeToAgents);
    graph.addConditionalEdges("websearch", routeToAgents);

    // Set the entry point
    graph.setEntryPoint("router");

    return graph.compile();
  }

  async processQuery(query) {
    try {
      const result = await this.graph.invoke({
        query: query,
        complete: false
      });
      console.log('Graph execution complete with result:', result);

      return {
        responses: result.responses,
        agents: result.processedAgents,
        reasoning: result.reasoning
      };
    } catch (error) {
      console.error('Error processing query through agent graph:', error);
      const fallbackResponse = await this.WEB_SEARCH.processQuery(query);
      return {
        responses: { WEB_SEARCH: fallbackResponse },
        agents: ['WEB_SEARCH'],
        reasoning: 'Fallback due to error in agent graph'
      };
    }
  }
}

module.exports = new AgentService(); 