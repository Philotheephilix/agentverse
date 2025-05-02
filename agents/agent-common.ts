import { HCS10Client, StandardNetworkType } from '../lib/hcs10/HCS10Client';
import { initializeHCS10Client, HCS10Tools } from '../lib/init';
import { OpenConvaiState } from '../lib/state/open-convai-state';
import { RegisteredAgent, IStateManager } from '../lib/state/state-types';
import * as dotenv from 'dotenv';
import { Logger } from '@hashgraphonline/standards-sdk';
import { ActiveConnection } from '../lib/state/state-types';

dotenv.config();

// Common agent interface
export interface AgentConfig {
  name: string;
  description: string;
  envPrefix: string;
  capabilities?: number[];
  autoAcceptConnections?: boolean;
}

// Agent connection details
export interface AgentConnection {
  client: HCS10Client;
  tools: Partial<HCS10Tools>;
  stateManager: IStateManager;
  agentDetails: RegisteredAgent;
}

// Initialize an agent from environment variables or register a new one
export async function initializeAgent(config: AgentConfig): Promise<AgentConnection | null> {
  const logger = Logger.getInstance({
    module: config.name,
    level: 'debug',
  });

  logger.info(`Initializing ${config.name} agent...`);

  // Initialize HCS10 client with operator credentials
  const { 
    hcs10Client, 
    tools, 
    stateManager 
  } = initializeHCS10Client({
    clientConfig: {
      operatorId: process.env.HEDERA_OPERATOR_ID,
      operatorKey: process.env.HEDERA_PRIVATE_KEY || process.env.HEDERA_OPERATOR_KEY,
      network: (process.env.HEDERA_NETWORK || 'testnet') as StandardNetworkType,
      logLevel: 'debug',
    }
  });

  // Check if agent exists in environment variables
  const prefix = config.envPrefix;
  const agent = loadAgentFromEnv(prefix);

  if (agent) {
    logger.info(`Found existing ${config.name} agent with accountId: ${agent.accountId}`);
    
    // Set as current agent in state manager
    stateManager.setCurrentAgent(agent);
    
    return {
      client: hcs10Client,
      tools,
      stateManager,
      agentDetails: agent
    };
  }

  // If agent doesn't exist, register a new one
  try {
    logger.info(`No existing ${config.name} agent found. Registering new agent...`);
    
    const result = await tools.registerAgentTool.invoke({
      name: config.name,
      description: config.description,
      capabilities: config.capabilities || [0], // Default to TEXT_GENERATION
      setAsCurrent: true,
      persistence: {
        prefix: config.envPrefix,
      }
    });

    const agentDetails = JSON.parse(result);
    
    if (!agentDetails.success) {
      logger.error(`Failed to register ${config.name} agent: ${agentDetails.message}`);
      return null;
    }

    const agent: RegisteredAgent = {
      name: agentDetails.name,
      accountId: agentDetails.accountId,
      inboundTopicId: agentDetails.inboundTopicId,
      outboundTopicId: agentDetails.outboundTopicId,
      profileTopicId: agentDetails.profileTopicId,
      privateKey: agentDetails.privateKey,
    };

    logger.info(`Successfully registered ${config.name} agent with accountId: ${agent.accountId}`);

    return {
      client: hcs10Client,
      tools,
      stateManager,
      agentDetails: agent
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error registering ${config.name} agent:`, errorMessage);
    return null;
  }
}

// Load agent details from environment variables
function loadAgentFromEnv(prefix: string): RegisteredAgent | null {
  const accountId = process.env[`${prefix}_ACCOUNT_ID`];
  const privateKey = process.env[`${prefix}_PRIVATE_KEY`];
  const inboundTopicId = process.env[`${prefix}_INBOUND_TOPIC_ID`];
  const outboundTopicId = process.env[`${prefix}_OUTBOUND_TOPIC_ID`];
  const profileTopicId = process.env[`${prefix}_PROFILE_TOPIC_ID`];

  if (!accountId || !privateKey || !inboundTopicId || !outboundTopicId) {
    return null;
  }

  return {
    name: `${prefix} Agent`,
    accountId,
    privateKey,
    inboundTopicId,
    outboundTopicId,
    profileTopicId,
  };
}

// Start connection monitoring for an agent
export async function startAgentMonitoring(
  connection: AgentConnection, 
  autoAcceptConnections: boolean = false
): Promise<void> {
  const logger = Logger.getInstance({
    module: connection.agentDetails.name,
    level: 'debug',
  });
  
  logger.info('Starting connection monitoring...');
  
  try {
    // Start monitoring for connection requests
    if (connection.tools.connectionMonitorTool) {
      connection.tools.connectionMonitorTool.invoke({
        monitorDurationSeconds: 86400, // 24 hours
        acceptAll: autoAcceptConnections, // Auto-accept based on configuration
      }).then(() => {
        logger.info('Connection monitoring completed.');
      }).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error in connection monitoring:', errorMessage);
      });
      
      logger.info(`Started connection monitoring${autoAcceptConnections ? ' with auto-accept' : ''}`);
    } else {
      logger.warn('Connection monitor tool not available');
    }
    
    // Start checking for messages
    if (connection.tools.checkMessagesTool) {
      // Initial check
      await checkForMessages(connection);
      
      // Set up periodic checks (every 10 seconds)
      setInterval(() => {
        checkForMessages(connection).catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error('Error checking for messages:', errorMessage);
        });
      }, 10000);
      
      logger.info('Started message monitoring');
    } else {
      logger.warn('Check messages tool not available');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error starting agent monitoring:', errorMessage);
    throw error;
  }
}

// Check for new messages
async function checkForMessages(connection: AgentConnection): Promise<void> {
  const logger = Logger.getInstance({
    module: connection.agentDetails.name,
    level: 'debug',
  });
  
  try {
    if (!connection.tools.checkMessagesTool) {
      return;
    }
    
    const connections = connection.stateManager.listConnections();
    
    for (const conn of connections) {
      try {
        const result = await connection.tools.checkMessagesTool.invoke({
          connectionId: conn.connectionTopicId,
          fetchLatest: true,
          lastMessagesCount: 5
        });
        
        // Process the messages
        const messages = JSON.parse(result);
        if (messages && Array.isArray(messages.messages) && messages.messages.length > 0) {
          logger.info(`Received ${messages.messages.length} new messages from ${conn.targetAgentName}`);
          
          // Process each message
          for (const message of messages.messages) {
            processMessage(connection, conn.connectionTopicId, conn.targetAgentName, message);
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error checking messages for connection ${conn.connectionTopicId}:`, errorMessage);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in checkForMessages:', errorMessage);
  }
}

// Process incoming messages
export async function processMessage(
  connection: AgentConnection,
  connectionTopicId: string,
  senderName: string,
  message: any
): Promise<void> {
  const logger = Logger.getInstance({
    module: connection.agentDetails.name,
    level: 'debug',
  });
  
  // Log the message
  logger.info(`Processing message from ${senderName}: ${JSON.stringify(message)}`);
  
  try {
    // Extract message content
    const content = message.content || message.data || JSON.stringify(message);
    
    // Default response - should be overridden by specific agent implementations
    if (connection.tools.sendMessageToConnectionTool) {
      await connection.tools.sendMessageToConnectionTool.invoke({
        connectionId: connectionTopicId,
        message: `Received your message. I am ${connection.agentDetails.name}, an automated agent.`,
      });
      
      logger.info(`Sent acknowledgment to ${senderName}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error processing message from ${senderName}:`, errorMessage);
  }
}
