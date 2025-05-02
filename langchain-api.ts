import { getAllAgents } from './contracts/getAllAgents.js';
import { initializeHCS10Agents } from './agents/initializeHCS10Agents.js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv
dotenv.config();
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
                            ws.send(JSON.stringify({ content }));
                        }
                    );
                //{"sequenceNumber":{"low":379,"high":0,"unsigned":true},"content":"Analysing for the best Agent for the task..."}▋
                ws.send(JSON.stringify({ content: `Subscribed to topic ${data.topicId}` }));
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
    // Import plugins using dynamic imports for ESM compatibility
    const hotelBookingModule = await import('./agents/hotelBooking/index.js');
    const foodDeliveryModule = await import('./agents/foodDelivery/index.js');
    const flightBookingModule = await import('./agents/flightBooking/index.js');
    
    const HotelBookingPlugin = hotelBookingModule.HotelBookingPlugin;
    const SearchHotelRoomsTool = hotelBookingModule.SearchHotelRoomsTool;
    const FoodDeliveryPlugin = foodDeliveryModule.FoodDeliveryPlugin;
    const OrderFoodTool = foodDeliveryModule.OrderFoodTool;
    const FlightBookingPlugin = flightBookingModule.FlightBookingPlugin;
    const BookFlightTool = flightBookingModule.BookFlightTool;

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
    
    // Initialize HCS10-based agents (hotel, food, flight)
    console.log('Initializing HCS10 agents with auto-connect functionality...');
    try {
      await initializeHCS10Agents();
      console.log('✅ HCS10 agents initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing HCS10 agents:', error);
    }

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

// Get directory name for __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load tools using dynamic imports for ESM compatibility
const echoTool = (await import(path.join(__dirname, 'tools/echo/index.js'))).default;
const createTokenTool = (await import(path.join(__dirname, 'tools/token/index.js'))).default;
const createTopicTool = (await import(path.join(__dirname, 'tools/topic/create/index.js'))).default;
const deleteTopicTool = (await import(path.join(__dirname, 'tools/topic/delete/index.js'))).default;
const submitTopicMessageTool = (await import(path.join(__dirname, 'tools/topic/submit/index.js'))).default;
const listTopicMessagesTool = (await import(path.join(__dirname, 'tools/topic/list/index.js'))).default;
const mintNftTool = (await import(path.join(__dirname, 'tools/mintNft/index.js'))).default;
const createAgentTool = (await import(path.join(__dirname, 'tools/agent/create/index.js'))).default;
const listenAgentTool = (await import(path.join(__dirname, 'tools/agent/listen/index.js'))).default;
// For LangChain compatibility, import DynamicTool
import { DynamicTool } from 'langchain/tools';
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
    let output = result;
    if (typeof result === 'object' && result !== null) {
      if ('output' in result && typeof result.output === 'string') {
        output = result.output;
      } else {
        output = JSON.stringify(result);
      }
    }
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
      message: `{"User": "${userTopicId}", "prompt": "${prompt}"}`
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
