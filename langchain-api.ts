import { getAllAgents } from './contracts/getAllAgents';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);

// --- WebSocket Topic Listener Route ---
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws: { on: (arg0: string, arg1: { (message: any): void; (): void; }) => void; send: (arg0: string) => void; }) => {
  let subscription: any = null;
  ws.on('message', (message?: { toString: () => string; }) => {
    try {
      const data = JSON.parse(message?.toString() || "");
      if (data.topicId) {
        const { Client, TopicMessageQuery, AccountId, PrivateKey } = require("@hashgraph/sdk");
        const MY_ACCOUNT_ID = AccountId.fromString(process.env.MY_ACCOUNT_ID || "0.0.5864744");
        const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY || "302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");
        const client = Client.forTestnet();
        client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
        subscription = new TopicMessageQuery()
          .setTopicId(data.topicId)
          .setStartTime(new Date())
          .subscribe(
            client,
            (error?: any) => {
              if (error) {
                ws.send(JSON.stringify({ error: error.message }));
              }
            },
            (msg: { contents: any; sequenceNumber: any; }) => {
              const content = Buffer.from(msg.contents).toString("utf-8");
              ws.send(JSON.stringify({ sequenceNumber: msg.sequenceNumber, content }));
            }
          );
        ws.send(JSON.stringify({ status: `Subscribed to topic ${data.topicId}` }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: err }));
    }
  });
  ws.on('close', () => {
    if (subscription) subscription.unsubscribe();
  });
});

server.on('upgrade', (request: { url: string; }, socket: { destroy: () => void; }, head: any) => {
  if (request.url === '/ws-topic-listen') {
    wss.handleUpgrade(request, socket, head, (ws: any) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

(async () => {
  try {
    const { HotelBookingPlugin, SearchHotelRoomsTool } = require('./agents/hotelBooking/index.ts');
    const { FoodDeliveryPlugin, OrderFoodTool } = require('./agents/foodDelivery/index.ts');
    const { FlightBookingPlugin, BookFlightTool } = require('./agents/flightBooking/index.ts');

    // Initialize HotelBooking agent
    const hotelBooking = new HotelBookingPlugin();
    await hotelBooking.onLoad({ registerTool: () => {} });
    console.log('HotelBooking agent initialized.');
    const hotelBookingTool = new SearchHotelRoomsTool();

    // Initialize FoodDelivery agent
    const foodDelivery = new FoodDeliveryPlugin();
    await foodDelivery.onLoad({ registerTool: () => {} });
    console.log('FoodDelivery agent initialized.');
    const foodDeliveryTool = new OrderFoodTool();

    // Initialize FlightBooking agent
    const flightBooking = new FlightBookingPlugin();
    await flightBooking.onLoad({ registerTool: () => {} });
    console.log('FlightBooking agent initialized.');
    const flightBookingTool = new BookFlightTool();

    // Assert and wrap all tools as DynamicTool
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
      modelName: 'gpt-4o',
    });

    // Initialize all agent plugins before starting the server
    executor = await initializeAgentExecutorWithOptions(
      [
        // echoDynamic, 
        // createTokenDynamic, 
        // createTopicDynamic, 
        // deleteTopicDynamic,
        // submitTopicMessageDynamic, 
        // listTopicMessagesDynamic, 
        mintNftDynamic,
        createAgentDynamic, 
        listenAgentDynamic,
        hotelBookingTool,
        foodDeliveryTool,
        flightBookingTool
      ],
      model,
      {
        agentType: 'openai-functions',
        verbose: true,
      }
    );
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

// Agent executor with all tools
let executor: any;

// API endpoint for prompt analysis and tool invocation
// To create a token, use a prompt like:
// "Create a token with name MyToken, symbol MTK, supply 1000 using accountId 0.0.xxxx and privateKey ..."
app.post('/api/ask', async (req: any, res: any) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!executor) return res.status(503).json({ error: 'Agent not ready' });
    const result = await executor.call({ input: prompt }, { maxAttempts: 30 });
    // Patch: always return a string output
    let output = result;
    if (typeof result === 'object' && result !== null) {
      if ('output' in result && typeof result.output === 'string') {
        output = result.output;
      } else {
        output = JSON.stringify(result);
      }
    }
    const toolInput11 = {
      topicId: "0.0.5932000",
      message: output
    };
    const result1 = await submitTopicMessageTool.func(toolInput11);
    res.json({ output });
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
    let { prompt,userTopicId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!userTopicId) return res.status(400).json({ error: 'User topicId required' })
      else{
        const toolInput = {
          topicId: userTopicId,
          message: `Analysing for the best Agent for the task...`
        };
        await submitTopicMessageTool.func(toolInput);
      }
    const agentsFromContract = await getAllAgents();
    console.log(agentsFromContract);
    if (!executor) return res.status(503).json({ error: 'Agent not ready' });

    const agentSelectionPrompt = `Given the following user prompt and a list of agents, select the best agent for the task. Return only the topicId of the best agent as a string.\n\nUser prompt: ${prompt}\n\nAgents: ${JSON.stringify(agentsFromContract, null, 2)} only return topicId without quotes and nothing else`;
    const selectionResult = await executor.call({ input: agentSelectionPrompt });
    let selectedTopicId = selectionResult?.output?.trim() || selectionResult?.text?.trim();
    if (selectedTopicId && selectedTopicId.startsWith('{')) {
      try {
        const parsed = JSON.parse(selectedTopicId);
        selectedTopicId = parsed.topicId || parsed.id || '';
      } catch {}
    }
    selectedTopicId.replace("\"", "").replace("\"", "");

    selectedTopicId = selectedTopicId.trim();
    selectedTopicId.toString()
    console.log("Selected topicId: " + selectedTopicId);
    const chosenAgent = agentsFromContract.find((a: any) => a.topicId === selectedTopicId);
    if (chosenAgent) {
      const toolInput = {
        topicId: userTopicId,
        message: `Selected Agent ${chosenAgent.agentName}`
      };
      const result = await submitTopicMessageTool.func(toolInput);
      console.log(result)
          // Call the submit_topic_message tool directly with correct input format to the agents topicid
    const toolInput11 = {
      topicId: chosenAgent.topicId,
      message: `${prompt}`
    };
    const result1 = await submitTopicMessageTool.func(toolInput11);
    console.log(result1)
    const responseWithTopic = {
      ...result,
      topicId: chosenAgent.topicId,
      agentName: chosenAgent.agentName
    };
    res.json(responseWithTopic);
    }



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
server.listen(PORT, () => {
  console.log(`LangChain API server running on port ${PORT}`);
  console.log(`WebSocket topic listener available at ws://localhost:${PORT}/ws-topic-listen`);
});
