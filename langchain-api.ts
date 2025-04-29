// LangChain API using OpenAI and an Echo tool
require('dotenv').config();
const express = require('express');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const path = require('path');
const app = express();
app.use(express.json());

// Import and call onLoad for hotelBooking agent before starting the API server
(async () => {
  try {
    const { HotelBookingPlugin } = require('./agents/hotelBooking/index.ts');
    const hotelBooking = new HotelBookingPlugin();
    await hotelBooking.onLoad({ registerTool: () => {} });
    console.log('HotelBooking agent initialized.');
  } catch (err) {
    console.error('Failed to initialize HotelBooking agent:', err);
    process.exit(1);
  }
})();

// Load tools
const echoTool = require(path.join(__dirname, 'tools/echo'));
const createTokenTool = require(path.join(__dirname, 'tools/token'));
const createTopicTool = require(path.join(__dirname, 'tools/topic/create'));
const deleteTopicTool = require(path.join(__dirname, 'tools/topic/delete'));
const submitTopicMessageTool = require(path.join(__dirname, 'tools/topic/submit'));
const listTopicMessagesTool = require(path.join(__dirname, 'tools/topic/list'));
const mintNftTool = require(path.join(__dirname, 'tools/mintNft'));
const createAgentTool = require(path.join(__dirname, 'tools/agent/create'));
const listenAgentTool = require(path.join(__dirname, 'tools/agent/listen'));
// For LangChain compatibility, wrap CommonJS exports as DynamicTool if needed
const { DynamicTool } = require('langchain/tools');
function assertTool(tool: any, label: string) {
  if (!tool) throw new Error(`${label} is undefined or not exported correctly`);
  if (typeof tool.name !== 'string') throw new Error(`${label} is missing a string 'name' property`);
  // Optional: Log tool for debugging
  console.log(`${label} loaded:`, tool.name);
}

assertTool(echoTool, 'echoTool');
assertTool(createTokenTool, 'createTokenTool');
assertTool(createTopicTool, 'createTopicTool');
assertTool(deleteTopicTool, 'deleteTopicTool');
assertTool(submitTopicMessageTool, 'submitTopicMessageTool');
assertTool(listTopicMessagesTool, 'listTopicMessagesTool');

const echoDynamic = new DynamicTool(echoTool);
const createTokenDynamic = new DynamicTool(createTokenTool);
const createTopicDynamic = new DynamicTool(createTopicTool);
const deleteTopicDynamic = new DynamicTool(deleteTopicTool);
const submitTopicMessageDynamic = new DynamicTool(submitTopicMessageTool);
const listTopicMessagesDynamic = new DynamicTool(listTopicMessagesTool);
const mintNftDynamic = new DynamicTool(mintNftTool);
const createAgentDynamic = new DynamicTool(createAgentTool);
const listenAgentDynamic = new DynamicTool(listenAgentTool);

// OpenAI model setup (expects OPENAI_API_KEY in env)
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  modelName: 'gpt-4o-mini',
});

// Agent executor with both tools
let executor: any;
(async () => {
  // Initialize all agent plugins before starting the server
  executor = await initializeAgentExecutorWithOptions(
    [echoDynamic, createTokenDynamic, createTopicDynamic, deleteTopicDynamic, submitTopicMessageDynamic, listTopicMessagesDynamic, mintNftDynamic, createAgentDynamic, listenAgentDynamic],
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
app.post('/api/ask', async (req: any, res: any) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!executor) return res.status(503).json({ error: 'Agent not ready' });
    const result = await executor.call({ input: prompt });
    res.json(result);
  } catch (err) {
    // TS18046: 'err' is of type 'unknown'.
    if (err && typeof err === 'object' && 'message' in err) {
      res.status(500).json({ error: (err as any).message });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});
app.post('/api/analyse', async (req: any, res: any) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!executor) return res.status(503).json({ error: 'Agent not ready' });
    const result = await executor.call({ input: prompt });
    res.json(result);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      res.status(500).json({ error: (err as any).message });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LangChain API server running on port ${PORT}`);
});
