// LangChain API using OpenAI and an Echo tool
require('dotenv').config();
const express = require('express');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const path = require('path');
const app = express();
app.use(express.json());

// Load tools
const echoTool = require(path.join(__dirname, 'tools/echo'));
const createTokenTool = require(path.join(__dirname, 'tools/token'));
const createTopicTool = require(path.join(__dirname, 'tools/topic/create'));
const deleteTopicTool = require(path.join(__dirname, 'tools/topic/delete'));
const submitTopicMessageTool = require(path.join(__dirname, 'tools/topic/submit'));
const listTopicMessagesTool = require(path.join(__dirname, 'tools/topic/list'));
// For LangChain compatibility, wrap CommonJS exports as DynamicTool if needed
const { DynamicTool } = require('langchain/tools');
const echoDynamic = new DynamicTool(echoTool);
const createTokenDynamic = new DynamicTool(createTokenTool);
const createTopicDynamic = new DynamicTool(createTopicTool);
const deleteTopicDynamic = new DynamicTool(deleteTopicTool);
const submitTopicMessageDynamic = new DynamicTool(submitTopicMessageTool);
const listTopicMessagesDynamic = new DynamicTool(listTopicMessagesTool);

// OpenAI model setup (expects OPENAI_API_KEY in env)
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  modelName: 'gpt-4o-mini',
});

// Agent executor with both tools
let executor;
(async () => {
  executor = await initializeAgentExecutorWithOptions(
    [echoDynamic, createTokenDynamic, createTopicDynamic, deleteTopicDynamic, submitTopicMessageDynamic, listTopicMessagesDynamic],
    model,
    {
      agentType: 'openai-functions',
      verbose: true,
    }
  );
})();

// API endpoint for prompt analysis and tool invocation
// To create a token, use a prompt like:
// "Create a token with name MyToken, symbol MTK, supply 1000 using accountId 0.0.xxxx and privateKey ..."
app.post('/api/ask', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!executor) return res.status(503).json({ error: 'Agent not ready' });
    const result = await executor.call({ input: prompt });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LangChain API server running on port ${PORT}`);
});
