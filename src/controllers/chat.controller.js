// chat.controller.js
const agentService = require("../services/agent.service");
const memoryService = require("../services/memory.service");


class ChatController {

  async handleChatRequest(req, res) {
    try {
      const { message, userId = "default_user" } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log(`Processing user message: \"${message}\"`);
      
      const memoryResults = await memoryService.getAllMemory(userId);
      // const memoryResults = await memoryService.getRecentHistory(userId);
      
      const result = await agentService.processQuery(message, memoryResults);
      
      // Only store in memory if we have a valid response
      if (result && result.responseSummary) {
        const messages = memoryService.formatMessages(
          message,
          result.responseSummary
        );
        await memoryService.addToMemory(messages, userId);
      } else if (result && result.responses) {
        // Fallback to using raw agent responses if summary generation failed
        const fallbackResponse = Object.values(result.responses).join("\n\n");
        const messages = memoryService.formatMessages(
          message,
          fallbackResponse
        );
        await memoryService.addToMemory(messages, userId);
      }
      
      // Include memory results in response
      res.json({
        ...result,
        // relatedMemory: memoryResults,
      });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "There was a problem processing your request" 
      });
    }
  }

}

module.exports = new ChatController();