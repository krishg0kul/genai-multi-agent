const { Graph, END } = require('@langchain/langgraph');
const RouterAgent = require('../agents/RouterAgent');
const ITAgent = require('../agents/ITAgent');
const HRAgent = require('../agents/HRAgent');
const FinanceAgent = require('../agents/FinanceAgent');
const WebSearchAgent = require('../agents/WebSearchAgent');
const DocumentService = require('./document.service');


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

      // Create the workflow graph
      this.graph = await this.createWorkflowGraph();
    } catch (error) {
      console.error('Error initializing agent system:', error);
      throw error;
    }
  }

  async createWorkflowGraph() {
    // Create graph
    const graph = new Graph();

    const routerNode = async (state) => {
      const routingResult = await this.router.decideAgent(state.query);

      console.log('Router decided to use:', routingResult.agent);

      return {
        ...state,
        agent: routingResult.agent,
        reasoning: routingResult.reasoning
      };
    };

    const itNode = async (state) => {
      console.log('IT Agent processing query:', state.query);
      const response = await this.IT.processQuery(state.query);
      return {
        ...state,
        response: response,
        complete: true
      };
    };

    const hrNode = async (state) => {
      console.log('HR Agent processing query:', state.query);
      const response = await this.HR.processQuery(state.query);
      return {
        ...state,
        response: response,
        complete: true
      };
    };

    const financeNode = async (state) => {
      console.log('Finance Agent processing query:', state.query);
      const response = await this.FINANCE.processQuery(state.query);
      return {
        ...state,
        response: response,
        complete: true
      };
    };

    const webSearchNode = async (state) => {
      const response = await this.WEB_SEARCH.processQuery(state.query);
      return {
        ...state,
        response: response,
        complete: true
      };
    };

    const routeToAgent = (state) => {
      const agent = state.agent;
      switch (agent) {
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

    graph.addConditionalEdges("router", routeToAgent);

    // Set the entry point to the router
    graph.setEntryPoint("router");

    const shouldEndWorkflow = (state) => {
      if (state.complete === true) {
        return END;
      }
      console.warn(`State.complete is not true for node leading to an END condition. Current agent: ${state.agent}`);
      return END;
    };

    graph.addConditionalEdges("it", shouldEndWorkflow);
    graph.addConditionalEdges("hr", shouldEndWorkflow);
    graph.addConditionalEdges("finance", shouldEndWorkflow);
    graph.addConditionalEdges("websearch", shouldEndWorkflow);

    return graph.compile();
  }

  async processQuery(query) {
    try {
      // Initialize the graph with the query
      const result = await this.graph.invoke({
        query: query,
        complete: false
      });
      console.log('Graph execution complete with result:', result);

      return {
        agent: result.agent,
        response: result.response,
        reasoning: result.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Error processing query through agent graph:', error);
      const fallbackResponse = await this.WEB_SEARCH.processQuery(query);
      return {
        agent: 'WEB_SEARCH',
        response: fallbackResponse,
        reasoning: 'Fallback due to error in agent graph'
      };
    }
  }
}

module.exports = new AgentService(); 