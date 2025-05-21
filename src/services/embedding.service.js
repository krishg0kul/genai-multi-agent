const { OllamaEmbeddings } = require("@langchain/community/embeddings/ollama");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

let embeddingsInstance = null;

function getEmbeddings() {
  if (!embeddingsInstance) {
    embeddingsInstance = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11435',
    });
    
    // embeddingsInstance = new GoogleGenerativeAIEmbeddings({
    //   apiKey: process.env.GOOGLE_API_KEY || 'AIzaSyAz5QPizZs3yeMEpm-7apKZw7mvFqVkTPQ',
    //   modelName: "embedding-002",
    // });
    
  }
  return embeddingsInstance;
}

module.exports = {
  getEmbeddings
}; 