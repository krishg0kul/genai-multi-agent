const path = require('path');

module.exports = {
  // Vector store settings
  vectorStorePath: path.join(process.cwd(), 'src', 'vectorstores'),
  
  // Text splitting settings
  chunkSize: 1000,
  chunkOverlap: 200,
  
  // Domain settings
  domains: ['hr', 'it', 'finance'],
  
  // Default number of results to return from similarity search
  defaultK: 5
}; 