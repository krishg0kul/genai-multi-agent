const BaseAgent = require("./BaseAgent");
const DocumentService = require("../services/document.service");
const WebSearchAgent = require("./WebSearchAgent");
const { getAgentDescription } = require("../config/agent.config");

class HRAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.domain = "hr";
    this.webSearchAgent = new WebSearchAgent(config);
    this.description = getAgentDescription("HR");
  }

  async evaluateConfidence(query, documentContext, chatHistory) {
    const formattedHistory =
      chatHistory.length > 0
        ? "\nPREVIOUS CONVERSATION:\n" +
          chatHistory
            .map(
              (msg) =>
                `${msg.role === "user" ? "User" : "Assistant"}: ${
                  msg.content || msg.memory
                }`
            )
            .join("\n")
        : "";

    const confidenceEvaluationPrompt = `
      Evaluate your confidence in answering the following query based on the available documentation:
      
      Query: "${query}"
      
      Available documentation context:
      ${documentContext}

      ${formattedHistory}
      
      Instructions:
      1. Analyze how well the documentation addresses the specific query
      2. Consider if the documentation provides clear, specific information that directly answers the query
      3. Assess if there are multiple possible interpretations of the query that the documentation doesn't clearly distinguish between
      4. Determine if the documentation contains all the necessary details to provide a complete answer
      
      Rate your confidence on a scale of 0 to 100, where:
      - 0-50: Documentation doesn't address the query at all or is extremely vague
      - 51-70: Documentation partially addresses the query but lacks important details
      - 71-80: Documentation addresses the query but some clarification would help
      - 81-90: Documentation addresses the query well with minor gaps
      - 91-100: Documentation fully addresses the query with all necessary details
      
      Respond with ONLY a number between 0 and 100 representing your confidence percentage.
    `;

    const confidenceResult = await this.generateResponse(
      confidenceEvaluationPrompt
    );
    // Extract the number from the response
    const confidenceMatch = confidenceResult.match(/\d+/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[0]) : 0;

    console.log(`Confidence evaluation for query "${query}": ${confidence}%`);

    return {
      confidence,
      needsClarification: confidence < 75,
    };
  }

  async generateClarifyingQuestion(query, documentContext) {
    // Generate a clarifying question based on the query and available documentation
    const clarifyingQuestionPrompt = `
      Generate a clarifying question for the following user query:
      
      Query: "${query}"
      
      Available documentation context:
      ${documentContext}
      
      Instructions:
      1. Identify the specific aspect of the query that needs clarification
      2. Formulate a clear, concise question that will help you better understand the user's intent
      3. If possible, offer options based on the available documentation
      4. Make the question conversational and helpful
      
      For example, if the query is "what are the women's specific allowances?", you might ask:
      "I'd like to help you with information about women's specific allowances. Could you clarify which type of allowance you're interested in? For example, are you asking about maternity benefits, women's health programs, or another specific policy?"
      
      Your response should be ONLY the clarifying question, without any additional text.
    `;

    return await this.generateResponse(clarifyingQuestionPrompt);
  }

  async needsClarification(query, documentContext, chatHistory) {
    const confidenceEvaluation = await this.evaluateConfidence(
      query,
      documentContext,
      chatHistory
    );
    return confidenceEvaluation.needsClarification;
  }

  async processQuery(query, chatHistory = []) {
    try {
      console.log("HR Agent processing query:", query);

      // Use vector search to find relevant documents
      const relevantDocs = await DocumentService.similaritySearch(
        this.domain,
        query,
        5
      );

      // Prepare document context
      let documentContext = "";
      if (relevantDocs.length > 0) {
        const sortedDocs = relevantDocs.sort(
          (a, b) => (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0)
        );
        documentContext = sortedDocs.map((doc) => doc.pageContent).join("\n\n");
      }

      // Check if the query needs clarification
      const needsClarification = await this.needsClarification(
        query,
        documentContext,
        chatHistory
      );

      if (needsClarification) {
        console.log(
          "Query needs clarification, generating clarifying question"
        );
        return await this.generateClarifyingQuestion(query, documentContext);
      }

      // Format chat history
      const formattedHistory =
        chatHistory.length > 0
          ? "\nPREVIOUS CONVERSATION:\n" +
            chatHistory
              .map(
                (msg) =>
                  `${msg.role === "user" ? "User" : "Assistant"}: ${
                    msg.content || msg.memory
                  }`
              )
              .join("\n")
          : "";

      // Enhanced prompt with document context and focus on HR domain
      const prompt = `
        You are an HR specialist responding to a question about human resources matters.
        Your scope: ${this.description}

        ${formattedHistory}

        CURRENT QUESTION: "${query}"
        
        RELEVANT DOCUMENTATION:
        ${documentContext || "No specific company policies available."}
        
        Instructions:
        1. Consider the previous conversation context when providing your response
        2. Look for ANY relevant HR information in the documentation that relates to the query
        3. If you find information about policies, benefits, or HR guidelines, include it in your response
        4. Include EXACT details and rules - do NOT use placeholders
        5. Format your response with bullet points for better readability when listing multiple items
        6. Only respond with "FALLBACK_TO_WEB_SEARCH" if there is absolutely no relevant HR information
        
        Format your response to clearly separate different policy sections if multiple are relevant.
        
        IMPORTANT: Your response must be specific and detailed. Do not use placeholders or generic descriptions when the documentation provides specific information.
      `;

      // Generate response from the AI model
      console.log(
        "Generating HR response with relevant document context and chat history..."
      );
      const response = await this.generateResponse(prompt);

      // Check if we need to fall back to web search
      if (response.includes("FALLBACK_TO_WEB_SEARCH")) {
        console.log(
          "Documentation does not contain specific information, falling back to web search..."
        );
        return this.webSearchAgent.processQuery(query, chatHistory);
      }

      return response;
    } catch (error) {
      console.error("Error processing HR query:", error);
      // Fall back to web search on error
      console.log("Error in HR agent, falling back to web search...");
      return this.webSearchAgent.processQuery(query, chatHistory);
    }
  }
}

module.exports = HRAgent;
