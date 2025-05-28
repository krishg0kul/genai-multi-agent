const agentService = require('../services/agent.service');


class ChatController {

  async handleChatRequest(req, res) {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log(`Processing user message: "${message}"`);
      const result = await agentService.processQuery(message);
      
      res.json(result);
    } catch (error) {
      console.error('Error processing chat:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'There was a problem processing your request' 
      });
    }
  }

}

module.exports = new ChatController(); 