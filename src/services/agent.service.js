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
      const routingResult = await this.router.decideAgent(state.query, state.chatHistory);
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
      const response = await this.IT.processQuery(state.query, state.chatHistory);
      const cleanedResponse = await this.cleanAgentResponse('IT', response);
      return {
        ...state,
        responses: { ...state.responses, IT: cleanedResponse },
        processedAgents: [...state.processedAgents, 'IT']
      };
    };

    const hrNode = async (state) => {
      const response = await this.HR.processQuery(state.query, state.chatHistory);
      const cleanedResponse = await this.cleanAgentResponse('HR', response);
      return {
        ...state,
        responses: { ...state.responses, HR: cleanedResponse },
        processedAgents: [...state.processedAgents, 'HR']
      };
    };

    const financeNode = async (state) => {
      const response = await this.FINANCE.processQuery(state.query, state.chatHistory);
      const cleanedResponse = await this.cleanAgentResponse('FINANCE', response);
      return {
        ...state,
        responses: { ...state.responses, FINANCE: cleanedResponse },
        processedAgents: [...state.processedAgents, 'FINANCE']
      };
    };

    const webSearchNode = async (state) => {
      const response = await this.WEB_SEARCH.processQuery(state.query, state.chatHistory);
      
      // Skip cleaning for history-related queries
      const isHistoryQuery = state.query.toLowerCase().includes("last question") || 
                            state.query.toLowerCase().includes("previous question") ||
                            state.query.toLowerCase().includes("what did i ask");
      
      const cleanedResponse = isHistoryQuery ? response : await this.cleanAgentResponse('WEB_SEARCH', response);
      
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

    graph.addConditionalEdges("router", routeToAgents);
    graph.addConditionalEdges("it", routeToAgents);
    graph.addConditionalEdges("hr", routeToAgents);
    graph.addConditionalEdges("finance", routeToAgents);
    graph.addConditionalEdges("websearch", routeToAgents);

    // Set the entry point
    graph.setEntryPoint("router");

    return graph.compile();
  }

  containsClarifyingQuestion(response) {
    // Check if a response contains a clarifying question (ends with a question mark)
    return typeof response === 'string' && response.trim().endsWith('?');
  }

  async generateResponseSummary(responses) {
    // Check if any of the responses contain a clarifying question
    // const agentsWithQuestions = Object.entries(responses)
    //   .filter(([_, response]) => this.containsClarifyingQuestion(response))
    //   .map(([agent, _]) => agent);
    
    // // If there are clarifying questions, prioritize them
    // if (agentsWithQuestions.length > 0) {
    //   console.log(`Found clarifying questions from agents: ${agentsWithQuestions.join(', ')}`);
      
    //   // If there's only one agent with a question, return its response directly
    //   if (agentsWithQuestions.length === 1) {
    //     const agent = agentsWithQuestions[0];
    //     return responses[agent];
    //   }
      
    //   // If multiple agents have questions, combine them
    //   const questionPrompt = `
    //     Multiple agents have clarifying questions for the user:
    //     ${agentsWithQuestions.map(agent => `${agent}: ${responses[agent]}`).join('\n\n')}
        
    //     Please combine these questions into a single, comprehensive clarifying question that addresses all the ambiguities identified by the different agents.
    //     Make the question conversational and helpful, offering options when possible.
        
    //     Your response should be ONLY the combined clarifying question, without any additional text.
    //   `;
      
    //   try {
    //     return await this.router.generateResponse(questionPrompt);
    //   } catch (error) {
    //     console.error('Error generating combined clarifying question:', error);
    //     // Fall back to the first agent's question
    //     return responses[agentsWithQuestions[0]];
    //   }
    // }
    
    // If no clarifying questions, proceed with normal summary
    const prompt = `
      Create a concise, well-organized summary of the following responses from different departments:
      Responses: ${JSON.stringify(responses)}

      Instructions:
      1. Keep the response agent name at the beginning of the summary
      2. Combine the information into a cohesive, paragraph-based summary 
      3. Maintain all important details but eliminate redundancy
      4. Organize related information together regardless of source
      5. Keep a professional and consistent tone throughout
      6. Use line breaks to separate different topics
      7. If the response contains conversation history or meta-information, preserve that context
    `;

    try {
      return await this.router.generateResponse(prompt);
    } catch (error) {
      console.error('Error generating response summary:', error);
      return Object.values(responses).join('\n\n');
    }
  }

  async processQuery(query, chatHistory = []) {
    try {
      const result = await this.graph.invoke({
        query: query,
        chatHistory: chatHistory,
        complete: false
      });
      // console.log('Graph execution complete with result:', result);

      let responseSummary = await this.generateResponseSummary(result.responses);

      return {
        agents: result.processedAgents,
        reasoning: result.reasoning,
        responseSummary,
        // relatedMemory: chatHistory
      };
    } catch (error) {
      console.error('Error processing query through agent graph:', error);
      const fallbackResponse = await this.WEB_SEARCH.processQuery(query, chatHistory);
      const responseSummary = await this.generateResponseSummary({ WEB_SEARCH: fallbackResponse });
      
      return {
        responses: { WEB_SEARCH: fallbackResponse },
        agents: ['WEB_SEARCH'],
        reasoning: 'Fallback due to error in agent graph',
        responseSummary,
        // relatedMemory: chatHistory
      };
    }
  }
}

module.exports = new AgentService();
