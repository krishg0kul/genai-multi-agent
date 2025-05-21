# Multi-Agent Conversational AI System

A sophisticated multi-agent system built with LangChain and LangGraph, featuring specialized domain agents for IT, Finance, HR, and Web Search capabilities.

## Architecture

The system consists of the following components:

- **Router Agent**: Central dispatcher that analyzes user queries and routes them to appropriate domain agents
- **Domain Agents**:
  - IT Agent: Handles technical and system-related queries
  - Finance Agent: Manages financial and budgetary inquiries
  - HR Agent: Addresses personnel and policy-related questions
  - Web Search Agent: Provides fallback search capabilities

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
   GOOGLE_API_KEY=your_gemini_api_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── src/
│   ├── agents/           # Agent implementations
│   ├── vectorstores/     # Vector database setup
│   ├── data/            # Domain-specific training data
│   ├── config/          # Configuration files
│   └── utils/           # Utility functions
├── tests/               # Test files
└── README.md
```

## Features

- RAG-based domain agents with specialized knowledge bases
- Intelligent query routing
- Context retention across conversations
- Fallback mechanisms for handling edge cases
- Safety guardrails and response validation

## Technology Stack

- LangChain & LangGraph for agent orchestration
- Google's Gemini for LLM capabilities
- FAISS for vector storage
- Express.js for API endpoints
- Node.js runtime 