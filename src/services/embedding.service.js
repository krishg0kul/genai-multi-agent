const { OllamaEmbeddings } = require("@langchain/community/embeddings/ollama");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const dotenv = require('dotenv');
dotenv.config();

let embeddingsInstance = null;

function getEmbeddings() {
  if (!embeddingsInstance) {
    embeddingsInstance = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL,
      baseUrl: process.env.OLLAMA_BASE_URL,
    });
    
    // embeddingsInstance = new GoogleGenerativeAIEmbeddings({
    //   apiKey: process.env.GEMINI_API_KEY,
    //   modelName: "embedding-002",
    // });
    
  }
  return embeddingsInstance;
}

module.exports = {
  getEmbeddings
}; 