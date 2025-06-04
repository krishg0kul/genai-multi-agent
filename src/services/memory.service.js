const { default: MemoryClient } = require("mem0ai");
const dotenv = require("dotenv");
dotenv.config();

class MemoryService {
  constructor() {
    this.client = new MemoryClient({
      apiKey: process.env.MEM0_API_KEY,
    });
  }

  async addToMemory(messages, userId = "default_user") {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        console.warn("Invalid messages format or empty messages array");
        return null;
      }

      // Validate message format
      const validMessages = messages.every(
        (msg) =>
          msg &&
          typeof msg === "object" &&
          ["user", "assistant"].includes(msg.role) &&
          typeof msg.content === "string" &&
          msg.content.trim() !== ""
      );

      if (!validMessages) {
        console.warn("Invalid message format detected");
        return null;
      }

      // console.log("Adding to memory:", {
      //   userId,
      //   messageCount: messages.length,
      //   firstMessagePreview: messages[0].content.substring(0, 100) + "...",
      //   messages: JSON.stringify(messages) 
      // });

      const result = await this.client.add(messages, { user_id: userId });
      console.log("Successfully added to memory:", {
        userId,
        status: result ? "success" : "no_result",
      });
      return result;
    } catch (error) {
      console.error("Error adding to memory:", {
        error: error.message,
        userId,
      });
      return null;
    }
  }

  async searchMemory(query, userId = "default_user", isHistoryQuery = false) {
    try {
      let actualQuery = query;
      if (isHistoryQuery) {
        actualQuery = ".";
      } else if (!query || typeof query !== "string" || query.trim() === "") {
        console.warn("Invalid search query for non-history search");
        return [];
      }

      // console.log("Searching memory:", {
      //   userId,
      //   queryPreview: actualQuery.substring(0, 100) + "...",
      //   isHistoryQuery,
      // });

      const results = await this.client.search(actualQuery, {
        user_id: userId,
        sort: isHistoryQuery ? "created_at" : "relevance",
        limit: 15,
      });

      console.log("Memory search results:", {
        userId,
        resultCount: results ? results.length : 0,
        isHistoryQuery,
      });

      return isHistoryQuery && results ? results.reverse() : results || [];
    } catch (error) {
      console.error("Error searching memory:", {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  formatMessages(userQuery, assistantResponse) {
    if (!userQuery || !assistantResponse) {
      console.warn("Missing query or response for message formatting");
      return [];
    }

    return [
      { role: "user", content: userQuery.trim() },
      { role: "assistant", content: assistantResponse.trim() },
    ];
  }
}
module.exports = new MemoryService();
