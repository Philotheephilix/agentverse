import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws'; // Changed to import WebSocketServer properly
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import path from 'path';
import { fileURLToPath } from 'url';
import { Interface } from "ethers";

import { 
    Client, 
    ContractCallQuery, 
    Hbar,
    ContractId,
    AccountId,
    PrivateKey,
    TopicMessageQuery  // Added import here instead of requiring later
} from "@hashgraph/sdk";
  
interface Agent {
  agentName: string;
  description: string;
  topicId: string;
  agentAddress: string;
}

const setupClient = (): Client => {
  const client = Client.forTestnet();
  const myAccountId = AccountId.fromString("0.0.5864744");
  const myPrivateKey = PrivateKey.fromStringED25519("302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");
  client.setOperator(myAccountId, myPrivateKey);
  
  return client;
};

// Configure dotenv
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const client = setupClient();
const contractId = ContractId.fromString("0.0.5924695");

const iface = new Interface([
  "function getAllAgents() view returns (tuple(string agentName, string description, string topicId, address agentAddress)[])"
]);

async function getAllAgents(): Promise<Agent[]> {
  const query = new ContractCallQuery()
    .setGas(300000)
    .setContractId(contractId)
    .setFunction("getAllAgents")
    .setQueryPayment(new Hbar(2));

  const result = await query.execute(client);
  const rawBytes = result.asBytes();

  try {
    const decoded = iface.decodeFunctionResult("getAllAgents", rawBytes);
    const agentTuples = decoded[0];

    const agents: Agent[] = agentTuples.map((agent: any) => ({
      agentName: agent.agentName,
      description: agent.description,
      topicId: agent.topicId,
      agentAddress: agent.agentAddress
    }));

    console.log("Decoded agents:", agents);
    return agents;
  } catch (err) {
    console.error("Failed to decode agents:", err);
    return [];
  }
}

// --- WebSocket Topic Listener Route ---
const wss = new WebSocketServer({ noServer: true }); // Fixed constructor

wss.on('connection', (ws) => {
    let subscription: any = null;
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.topicId) {
                const MY_ACCOUNT_ID = AccountId.fromString(process.env.MY_ACCOUNT_ID || "0.0.5864744");
                const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY || "302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");
                const wsClient = Client.forTestnet();
                wsClient.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
                subscription = new TopicMessageQuery()
                    .setTopicId(data.topicId)
                    .setStartTime(new Date(Date.now() - 10 * 1000))
                    .subscribe(
                        wsClient,
                        (error) => {
                            if (error) {
                                ws.send(JSON.stringify({ error: error.message }));
                            }
                        },
                        (msg) => {
                            const content = Buffer.from(msg.contents).toString("utf-8");
                            ws.send(JSON.stringify({ content }));
                        }
                    );
                ws.send(JSON.stringify({ content: `Subscribed to topic ${data.topicId}` }));
            }
        } catch (err: any) {
            ws.send(JSON.stringify({ error: err.message || String(err) }));
        }
    });
    ws.on('close', () => {
        if (subscription) subscription.unsubscribe();
    });
});

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws-topic-listen') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Load tools
import { fileURLToPath as fileURLToPathFn } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const echoTool = await import(path.join(__dirname, 'tools/echo.js')).then(m => m.default || m);
const createTokenTool = await import(path.join(__dirname, 'tools/token.js')).then(m => m.default || m);
const createTopicTool = await import(path.join(__dirname, 'tools/topic/create.js')).then(m => m.default || m);
const deleteTopicTool = await import(path.join(__dirname, 'tools/topic/delete.js')).then(m => m.default || m);
const submitTopicMessageTool = await import(path.join(__dirname, 'tools/topic/submit.js')).then(m => m.default || m);
const listTopicMessagesTool = await import(path.join(__dirname, 'tools/topic/list.js')).then(m => m.default || m);
const mintNftTool = await import(path.join(__dirname, 'tools/mintNft.js')).then(m => m.default || m);
const createAgentTool = await import(path.join(__dirname, 'tools/agent/create.js')).then(m => m.default || m);
const listenAgentTool = await import(path.join(__dirname, 'tools/agent/listen.js')).then(m => m.default || m);

// For LangChain compatibility, import DynamicTool properly
import { DynamicTool } from 'langchain/tools';

function assertTool(tool: any, label: string) {
  if (!tool) throw new Error(`${label} is undefined or not exported correctly`);
  if (typeof tool.name !== 'string') throw new Error(`${label} is missing a string 'name' property`);
  // Optional: Log tool for debugging
  console.log(`${label} loaded:`, tool.name);
}

// Agent executor with all tools
let executor: any;

// Initialize agents and tools
(async () => {
  try {
    const { HotelBookingPlugin, SearchHotelRoomsTool } = await import('./agents/hotelBooking/index.js');
    const { FoodDeliveryPlugin, OrderFoodTool } = await import('./agents/foodDelivery/index.js');
    const { FlightBookingPlugin, BookFlightTool } = await import('./agents/flightBooking/index.js');

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
    console.error('Failed to initialize agents:', err);
    process.exit(1);
  }
})();

// API endpoint for prompt analysis and tool invocation
// To create a token, use a prompt like:
// "Create a token with name MyToken, symbol MTK, supply 1000 using accountId 0.0.xxxx and privateKey ..."
app.post('/api/ask', async (req, res) => {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/api/analyse', async (req, res) => {
  try {
    let { prompt, userTopicId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!userTopicId) return res.status(400).json({ error: 'User topicId required' });
    else {
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
    
    selectedTopicId = selectedTopicId.replace(/"/g, "").trim();
    console.log("Selected topicId: " + selectedTopicId);
    
    const chosenAgent = agentsFromContract.find((a: any) => a.topicId === selectedTopicId);
    if (chosenAgent) {
      const toolInput = {
        topicId: userTopicId,
        message: `Selected Agent ${chosenAgent.agentName}`
      };
      const result = await submitTopicMessageTool.func(toolInput);
      console.log(result);
      
      // Call the submit_topic_message tool directly with correct input format to the agents topicid
      const toolInput11 = {
        topicId: chosenAgent.topicId,
        message: `{"User": "${userTopicId}", "prompt": "${prompt}"}`
      };
      const result1 = await submitTopicMessageTool.func(toolInput11);
      console.log(result1);
      
      const responseWithTopic = {
        ...result,
        topicId: chosenAgent.topicId,
        agentName: chosenAgent.agentName
      };
      res.json(responseWithTopic);
    } else {
      res.status(404).json({ error: 'No matching agent found for selected topicId' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`LangChain API server running on port ${PORT}`);
  console.log(`WebSocket topic listener available at ws://localhost:${PORT}/ws-topic-listen`);
});
