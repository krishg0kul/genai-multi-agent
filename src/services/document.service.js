const fs = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { loadDocumentsFromDirectory } = require('../utils/fileLoader');
const { getEmbeddings } = require('./embedding.service');
const vectorStoreConfig = require('../config/vectorstore.config');

// vector stores
const vectorStores = {};

class DocumentService {

  static async initAllVectorStores() {
    try {
  
      await fs.mkdir(vectorStoreConfig.vectorStorePath, { recursive: true });
      
      // Initialize vector stores for each domain
      for (const domain of vectorStoreConfig.domains) {
        await this.initDomainVectorStore(domain);
      }
      
      console.log('All vector stores initialized');
      return true;
    } catch (error) {
      console.error('Error initializing vector stores:', error);
      return false;
    }
  }

  static async initDomainVectorStore(domain) {
    try {
      const domainVectorStorePath = path.join(vectorStoreConfig.vectorStorePath, domain);
      await fs.mkdir(domainVectorStorePath, { recursive: true });
      
      const vectorStoreExists = await fs.access(domainVectorStorePath)
        .then(() => true)
        .catch(() => false);
      
      // Get embeddings instance
      const embeddings = getEmbeddings();
      

      if (vectorStoreExists) {
        try {
          // Check if index.faiss exists in the directory
          const hasFaissIndex = await fs.access(path.join(domainVectorStorePath, 'index.faiss'))
            .then(() => true)
            .catch(() => false);
          
          if (hasFaissIndex) {
            console.log(`Loading existing vector store for ${domain} domain...`);
            vectorStores[domain] = await FaissStore.load(domainVectorStorePath, embeddings);
            console.log(`Existing vector store loaded for ${domain} domain`);
            return true;
          }
        } catch (loadError) {
          console.log(`Could not load existing vector store for ${domain}, creating new one:`, loadError.message);
        }
      }
      
      // If not vectorStoreExists
      const docsDir = path.join(process.cwd(), 'src', 'data', domain);
      
      await fs.mkdir(docsDir, { recursive: true });
      const docs = await loadDocumentsFromDirectory(docsDir);
      
      if (docs.length === 0) {
        console.log(`No documents found for ${domain} domain`);
        return false;
      }
      
      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: vectorStoreConfig.chunkSize || 1000,
        chunkOverlap: vectorStoreConfig.chunkOverlap || 200,
      });
      
      const splitDocs = await textSplitter.splitDocuments(docs);
      
      splitDocs.forEach((doc, index) => {
        doc.metadata = {
          ...doc.metadata,
          domain: domain,
          chunkIndex: index
        };
      });
            
      // Create and save vector store
      vectorStores[domain] = await FaissStore.fromDocuments(splitDocs, embeddings);
      await vectorStores[domain].save(domainVectorStorePath);
      
      return true;
    } catch (error) {
      console.error(`Error initializing vector store for ${domain}:`, error);
      return false;
    }
  }
  
  static async similaritySearch(domain, query, k = vectorStoreConfig.defaultK) {
    try {
      if (!vectorStores[domain]) {
        await this.initDomainVectorStore(domain);
      }
      
      if (!vectorStores[domain]) {
        console.log(`No vector store available for ${domain} domain`);
        return [];
      }
      
      const results = await vectorStores[domain].similaritySearch(query, k);
      console.log(`Found ${results.length} results for query "${query}" in ${domain} domain`);
      
      return results;
    } catch (error) {
      console.error(`Error performing similarity search in ${domain}:`, error);
      return [];
    }
  }
}

module.exports = DocumentService; 