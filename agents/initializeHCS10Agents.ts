import { Logger } from '@hashgraphonline/standards-sdk';
import * as dotenv from 'dotenv';
import { initializeAgent, startAgentMonitoring, AgentConnection } from './agent-common';
import { processHotelMessage } from './hotelBooking/agent';
import { processFoodDeliveryMessage } from './foodDelivery/agent';
import { processFlightBookingMessage } from './flightBooking/agent';

// Load environment variables
dotenv.config();

// Configure agent capabilities
// HCS-10 capabilities: 0 = TEXT_GENERATION, 1 = IMAGE_GENERATION, etc.
const TEXT_GENERATION = 0;

// Custom message handler type
type AgentMessageProcessor = (
  connection: AgentConnection,
  connectionTopicId: string,
  senderName: string,
  message: any
) => Promise<void>;

// Agent configuration type
interface AgentConfigWithProcessor {
  name: string;
  description: string;
  envPrefix: string;
  capabilities: number[];
  autoAcceptConnections: boolean;
  messageProcessor: AgentMessageProcessor;
}

// Agent configurations
const AGENTS: AgentConfigWithProcessor[] = [
  {
    name: 'Hotel Booking Agent',
    description: 'Book hotel rooms worldwide with various amenities and options',
    envPrefix: 'HOTEL_AGENT',
    capabilities: [TEXT_GENERATION],
    autoAcceptConnections: true,
    messageProcessor: processHotelMessage
  },
  {
    name: 'Food Delivery Agent',
    description: 'Order food from various restaurants for delivery',
    envPrefix: 'FOOD_AGENT',
    capabilities: [TEXT_GENERATION],
    autoAcceptConnections: true,
    messageProcessor: processFoodDeliveryMessage
  },
  {
    name: 'Flight Booking Agent',
    description: 'Book flights for domestic and international travel',
    envPrefix: 'FLIGHT_AGENT',
    capabilities: [TEXT_GENERATION],
    autoAcceptConnections: true,
    messageProcessor: processFlightBookingMessage
  }
];

// Active agent connections
const activeAgents: Record<string, AgentConnection> = {};

// Initialize all agents and set up message handlers
export async function initializeHCS10Agents(): Promise<void> {
  const logger = Logger.getInstance({
    module: 'AgentInitializer',
    level: 'debug',
  });
  
  logger.info('🤖 Initializing HCS-10 agents...');
  
  if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_PRIVATE_KEY) {
    logger.error('❌ Missing required environment variables: HEDERA_OPERATOR_ID and HEDERA_PRIVATE_KEY');
    throw new Error('Missing required Hedera credentials');
  }
  
  // Initialize each agent in sequence
  for (const agentConfig of AGENTS) {
    try {
      logger.info(`📋 Initializing ${agentConfig.name}...`);
      
      // Initialize the agent (creates if doesn't exist)
      const connection = await initializeAgent({
        name: agentConfig.name,
        description: agentConfig.description,
        envPrefix: agentConfig.envPrefix,
        capabilities: agentConfig.capabilities,
        autoAcceptConnections: agentConfig.autoAcceptConnections
      });
      
      if (!connection) {
        logger.error(`❌ Failed to initialize ${agentConfig.name}`);
        continue;
      }
      
      // Store the active connection
      activeAgents[agentConfig.envPrefix] = connection;
      
      // Start agent monitoring with auto-accept if enabled
      await startAgentMonitoring(connection, agentConfig.autoAcceptConnections);
      
      logger.info(`✅ ${agentConfig.name} initialized successfully with accountId: ${connection.agentDetails.accountId}`);
      logger.info(`   Inbound topic: ${connection.agentDetails.inboundTopicId}`);
      logger.info(`   Outbound topic: ${connection.agentDetails.outboundTopicId}`);
      
    } catch (error) {
      logger.error(`❌ Error initializing ${agentConfig.name}:`, error);
    }
  }
  
  const totalInitialized = Object.keys(activeAgents).length;
  logger.info(`🎉 Initialized ${totalInitialized}/${AGENTS.length} agents successfully`);
  
  if (totalInitialized > 0) {
    // Set up message monitoring for all active connections
    await setupAutoConnectAndMessageHandling();
  }
}

// Setup message monitoring and message handling for all agents
async function setupAutoConnectAndMessageHandling(): Promise<void> {
  const logger = Logger.getInstance({
    module: 'MessageMonitor',
    level: 'debug',
  });
  
  logger.info('Setting up automatic connection acceptance and message handling for all agents');
  
  // Set up message check interval for each agent
  for (const [prefix, connection] of Object.entries(activeAgents)) {
    // Find the matching agent config
    const agentConfig = AGENTS.find(a => a.envPrefix === prefix);
    if (!agentConfig) continue;
    
    // Set up periodic message checking (every 10 seconds)
    setInterval(async () => {
      try {
        // 1. Check for new connection requests (if auto-accept enabled)
        if (agentConfig.autoAcceptConnections && connection.tools.connectionMonitorTool) {
          try {
            await connection.tools.connectionMonitorTool.invoke({
              monitorDurationSeconds: 10,
              acceptAll: true
            });
          } catch (error) {
            logger.error(`Error monitoring connections for ${agentConfig.name}:`, error);
          }
        }
        
        // 2. Check existing connections for new messages
        const connections = connection.stateManager.listConnections();
        for (const conn of connections) {
          if (!connection.tools.checkMessagesTool) continue;
          
          try {
            const result = await connection.tools.checkMessagesTool.invoke({
              connectionId: conn.connectionTopicId,
              fetchLatest: true,
              lastMessagesCount: 5
            });
            
            // Process the messages
            const messagesResponse = JSON.parse(result);
            if (messagesResponse && Array.isArray(messagesResponse.messages) && messagesResponse.messages.length > 0) {
              logger.info(`Received ${messagesResponse.messages.length} new messages on connection ${conn.connectionTopicId}`);
              
              // Process each message with the agent's message processor
              for (const message of messagesResponse.messages) {
                try {
                  await agentConfig.messageProcessor(
                    connection,
                    conn.connectionTopicId,
                    conn.targetAgentName || 'Connected Agent',
                    message
                  );
                } catch (msgError) {
                  logger.error(`Error processing message with ${agentConfig.name}:`, msgError);
                }
              }
            }
          } catch (error) {
            logger.error(`Error checking messages for ${conn.connectionTopicId}:`, error);
          }
        }
      } catch (error) {
        logger.error(`Error in message handling for ${agentConfig.name}:`, error);
      }
    }, 10000);
    
    logger.info(`Message handling configured for ${agentConfig.name}`);
  }
  
  logger.info('✅ Automatic connection acceptance and message handling configured successfully');
}

// Auto-start is now handled by the launch-agents.ts script for ES module compatibility
// The main execution logic is now in launch-agents.ts
