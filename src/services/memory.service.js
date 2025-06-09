const fs = require('fs');
const path = require('path');
const dotenv = require("dotenv");
dotenv.config();

class MemoryService {
  constructor() {
    // Create memory directory if it doesn't exist
    this.memoryDir = path.join(__dirname, '../../memory/local');
    this.ensureDirectoryExists(this.memoryDir);
  }

  ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log(`Created directory: ${directory}`);
    }
  }

  getUserMemoryPath(userId) {
    return path.join(this.memoryDir, `${userId}.json`);
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

      const userMemoryPath = this.getUserMemoryPath(userId);
      
      // Add timestamp to each message
      const timestampedMessages = messages.map(msg => ({
        ...msg,
        timestamp: new Date().toISOString()
      }));
      
      // Read existing memory or create new one
      let memory = [];
      if (fs.existsSync(userMemoryPath)) {
        const fileContent = fs.readFileSync(userMemoryPath, 'utf8');
        memory = JSON.parse(fileContent);
      }
      
      // Append new messages
      memory = [...memory, ...timestampedMessages];
      
      // Write back to file
      fs.writeFileSync(userMemoryPath, JSON.stringify(memory, null, 2), 'utf8');
      
      console.log("Successfully added to memory:", {
        userId,
        messageCount: messages.length,
        totalMemorySize: memory.length
      });
      
      return true;
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
      const userMemoryPath = this.getUserMemoryPath(userId);
      
      // If file doesn't exist, return empty array
      if (!fs.existsSync(userMemoryPath)) {
        console.log(`No memory file found for user: ${userId}`);
        return [];
      }
      
      // Read memory file
      const fileContent = fs.readFileSync(userMemoryPath, 'utf8');
      const memory = JSON.parse(fileContent);
      
      // For history queries, return all messages (most recent first if specified)
      if (isHistoryQuery) {
        const results = [...memory]; // Create a copy to avoid modifying the original
        
        // Format the results to match the expected structure
        const formattedResults = results.map(msg => ({
          memory: msg.content,
          role: msg.role,
          timestamp: msg.timestamp
        }));
        
        console.log("Memory search results:", {
          userId,
          resultCount: formattedResults.length,
          isHistoryQuery
        });
        
        return formattedResults;
      }
      
      // For regular queries, we could implement a simple search
      // For now, just return recent messages as they're likely most relevant
      const recentMessages = memory.slice(-10); // Last 10 messages
      
      // Format the results to match the expected structure
      const formattedResults = recentMessages.map(msg => ({
        memory: msg.content,
        role: msg.role,
        timestamp: msg.timestamp
      }));
      
      console.log("Memory search results:", {
        userId,
        resultCount: formattedResults.length,
        isHistoryQuery
      });
      
      return formattedResults;
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
  
  // Helper method to get all memory for a user
  async getAllMemory(userId = "default_user") {
    try {
      const userMemoryPath = this.getUserMemoryPath(userId);
      
      // If file doesn't exist, return empty array
      if (!fs.existsSync(userMemoryPath)) {
        return [];
      }
      
      // Read memory file
      const fileContent = fs.readFileSync(userMemoryPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error("Error getting all memory:", {
        error: error.message,
        userId,
      });
      return [];
    }
  }
  
  // Helper method to clear memory for a user
  async clearMemory(userId = "default_user") {
    try {
      const userMemoryPath = this.getUserMemoryPath(userId);
      
      // If file exists, delete it
      if (fs.existsSync(userMemoryPath)) {
        fs.unlinkSync(userMemoryPath);
        console.log(`Cleared memory for user: ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error clearing memory:", {
        error: error.message,
        userId,
      });
      return false;
    }
  }
}
module.exports = new MemoryService();
