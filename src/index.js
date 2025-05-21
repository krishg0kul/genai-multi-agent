const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const agentService = require('./services/agent.service');
const chatRoutes = require('./routes/chat.routes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', chatRoutes);

(async () => {
  try {
    await agentService.initialize();
  } catch (error) {
    console.error('Failed to initialize agent system:', error);
    process.exit(1);
  }
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 