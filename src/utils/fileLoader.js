const path = require('path');
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const { CSVLoader } = require("langchain/document_loaders/fs/csv");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");

async function loadDocumentsFromDirectory(dirPath, recursive = true) {
  try {
    const loader = new DirectoryLoader(
      dirPath,
      {
        ".pdf": (path) => new PDFLoader(path),
        ".txt": (path) => new TextLoader(path),
        ".md": (path) => new TextLoader(path),
        ".docx": (path) => new DocxLoader(path),
        ".csv": (path) => new CSVLoader(path),
        ".json": (path) => new JSONLoader(path)
      },
      recursive
    );
    
    return await loader.load();
  } catch (error) {
    console.error(`Error loading directory ${dirPath}:`, error);
    throw error;
  }
}

module.exports = {
  loadDocumentsFromDirectory
}; 