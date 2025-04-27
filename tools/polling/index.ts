import { PrivateKey } from '@hashgraph/sdk';
import { LogLevel } from '@hashgraphonline/standards-sdk';
import { AgentMetadata } from '../utils/types';
import { HCS10Client,
    AgentBuilder,
    InboundTopicType,
    Logger,
    AIAgentCapability,
    HederaMirrorNode,
    NetworkType,
    HCSMessage,
    ConnectionsManager,
  Connection,
    TopicFeeConfig,
    FeeConfigBuilder } from '@hashgraphonline/standards-sdk';


export interface ValidationError {
  validation: string;
  code: string;
  message: string;
  path: string[];
}
const logger = new Logger({
    module: 'BobPollingAgent',
    level: 'debug',
    prettyPrint: true,
  });
export interface RegistrationProgressData {
  stage:
    | 'preparing'
    | 'submitting'
    | 'confirming'
    | 'completed'
    | 'verifying'
    | 'failed';
  message: string;
  progressPercent?: number;
  details?: Record<string, any>;
}

export type RegistrationProgressCallback = (
  data: RegistrationProgressData
) => void;

export interface AgentConfig<T> {
  accountId: string;
  privateKey: string;
  operatorId: string;
  inboundTopicId: string;
  outboundTopicId: string;
  profileTopicId: string;
  pfpTopicId: string;
  client: T;
}

export interface HCSClientConfig {
  network: NetworkType;
  operatorId: string;
  operatorPrivateKey: string;
  operatorPublicKey?: string;
  logLevel?: LogLevel;
  prettyPrint?: boolean;
  guardedRegistryBaseUrl?: string;
  feeAmount?: number; // Default fee amount for HIP-991 fee payments
}

export interface Message {
  message: string;
  sequence_number?: number;
}

export interface Links {
  next: string;
}

export interface ApiResponse {
  messages?: any[];
  links?: {
    next?: string;
  };
}

export interface RegistrationResponse {
  transaction: string;
  transaction_id: string;
}

export interface Topic {
  topicId: string;
  memo: string;
  adminKey: boolean;
  submitKey: boolean;
}

export interface CreateAgentResponse {
  inboundTopicId: string;
  outboundTopicId: string;
  pfpTopicId: string;
  profileTopicId: string;
}

export interface CreateAccountResponse {
  accountId: string;
  privateKey: string;
}

export interface InscribePfpResponse {
  pfpTopicId: string;
  transactionId: string;
  success: boolean;
  error?: string;
}

export interface StoreHCS11ProfileResponse {
  profileTopicId: string;
  pfpTopicId?: string;
  transactionId: string;
  success: boolean;
  error?: string;
}

export interface GetTopicsResponse {
  inboundTopic: string;
  outboundTopic: string;
}

export interface HandleConnectionRequestResponse {
  connectionTopicId: string;
  confirmedConnectionSequenceNumber: number;
  operatorId: string;
}

export interface WaitForConnectionConfirmationResponse {
  connectionTopicId: string;
  sequence_number: number;
  confirmedBy: string;
  memo: string;
}

export interface GetAccountAndSignerResponse {
  accountId: string;
  signer: PrivateKey;
}

export interface AgentRegistrationResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  transaction?: string;
  confirmed?: boolean;
  state?: AgentCreationState;
  metadata?: {
    capabilities?: number[];
    [key: string]: any;
  };
}

export interface AgentCreationState {
  pfpTopicId?: string;
  inboundTopicId?: string;
  outboundTopicId?: string;
  profileTopicId?: string;
  currentStage:
    | 'init'
    | 'pfp'
    | 'topics'
    | 'profile'
    | 'registration'
    | 'complete';
  completedPercentage: number;
  error?: string;
  createdResources?: string[];
  agentMetadata?: Record<string, any>;
}

export interface RegistrationSearchOptions {
  tags?: string[];
  accountId?: string;
  network?: string;
}

export interface RegistrationSearchResult {
  registrations: Array<{
    id: string;
    transaction_id: string;
    status: 'pending' | 'success' | 'failed';
    network: string;
    account_id: string;
    inbound_topic_id: string;
    outbound_topic_id: string;
    operator_id: string;
    metadata: AgentMetadata;
    registry_topic_id: string;
    created_at: string;
    updated_at: string;
  }>;
  error?: string;
  success: boolean;
}

export type RegistrationResult = {
  transaction?: any;
  transactionId?: string;
  success: boolean;
  error?: string;
  validationErrors?: ValidationError[];
};

export interface RegistrationSearchOptions {
  tags?: string[];
  accountId?: string;
  network?: string;
}

export interface RegistrationSearchResult {
  registrations: Array<{
    id: string;
    transaction_id: string;
    status: 'pending' | 'success' | 'failed';
    network: string;
    account_id: string;
    inbound_topic_id: string;
    outbound_topic_id: string;
    operator_id: string;
    metadata: AgentMetadata;
    registry_topic_id: string;
    created_at: string;
    updated_at: string;
  }>;
  error?: string;
  success: boolean;
}
async function loadConnectionsUsingManager(agent: {
    client: HCS10Client;
    accountId: string;
    inboundTopicId: string;
    outboundTopicId: string;
  }): Promise<{
    connections: Map<string, Connection>;
    connectionManager: ConnectionsManager;
    lastProcessedTimestamp: Date;
  }> {
    logger.info('Loading existing connections using ConnectionsManager');
  
    const connectionManager = new ConnectionsManager({
      baseClient: agent.client,
      logLevel: 'debug',
    });
  
    const connectionsArray = await connectionManager.fetchConnectionData(
      agent.accountId
    );
    logger.info(`Found ${connectionsArray.length} connections`);
  
    const connections = new Map<string, Connection>();
    let lastTimestamp = new Date(0);
  
    for (const connection of connectionsArray) {
      connections.set(connection.connectionTopicId, connection);
  
      if (
        connection.created &&
        connection.created.getTime() > lastTimestamp.getTime()
      ) {
        lastTimestamp = connection.created;
        }
      if (
        connection.lastActivity &&
        connection.lastActivity.getTime() > lastTimestamp.getTime()
      ) {
        lastTimestamp = connection.lastActivity;
      }
    }
  
    logger.info(
      `Finished loading. ${connections.size} active connections found, last outbound timestamp: ${lastTimestamp}`
    );
  
    return {
      connections,
      connectionManager,
      lastProcessedTimestamp: lastTimestamp,
    };
  }
  async function handleStandardMessage(
    agent: {
      client: HCS10Client;
      accountId: string;
      operatorId: string;
    },
    message: HCSMessage,
    connectionTopicId: string
  ): Promise<void> {
    if (message.data === undefined) {
      return;
    }
  
    if (
      !connectionTopicId ||
      !connectionTopicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)
    ) {
      logger.error(`Invalid connection topic ID format: ${connectionTopicId}`);
      return;
    }
  
    let rawContent: string = message.data;
  
    if (rawContent.startsWith('hcs://')) {
      try {
        const content = await agent.client.getMessageContent(rawContent);
        rawContent = content as string;
      } catch (error) {
        logger.error(`Failed to resolve message content: ${error}`);
        return;
      }
    }      }
  
     
  
  async function handleConnectionRequest(
    agent: {
      client: HCS10Client;
      accountId: string;
      operatorId: string;
      inboundTopicId: string;
      outboundTopicId: string;
    },
    message: HCSMessage,
    connectionManager: ConnectionsManager
  ): Promise<string | null> {
    if (!message.operator_id) {
      logger.warn('Missing operator_id in connection request');
      return null;
    }
    if (!message.created) {
      logger.warn('Missing created timestamp in connection request');
      return null;
    }
    if (
      typeof message.sequence_number !== 'number' ||
      message.sequence_number <= 0
    ) {
      logger.warn(
        `Invalid sequence_number in connection request: ${message.sequence_number}`
      );
      return null;
    }
    function extractAccountId(operatorId: string): string | null {
        if (!operatorId) return null;
        const parts = operatorId.split('@');
        return parts.length === 2 ? parts[1] : null;
      }
      
    const requesterOperatorId = message.operator_id;
    const requesterAccountId = extractAccountId(requesterOperatorId);
    if (!requesterAccountId) {
      logger.warn(`Invalid operator_id format: ${requesterOperatorId}`);
      return null;
    }
  
    logger.info(
      `Processing connection request #${message.sequence_number} from ${requesterOperatorId}`
    );
  
    // Look for any existing connection for this sequence number
    let existingConnection;
    for (const conn of connectionManager.getAllConnections()) {
      if (conn.inboundRequestId === message.sequence_number) {
        existingConnection = conn;
        break;
      }
    }
    
    if (existingConnection) {
      // Make sure we have a valid topic ID, not a reference key
      if (existingConnection.connectionTopicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
        logger.warn(
          `Connection already exists for request #${message.sequence_number} from ${requesterOperatorId}. Topic: ${existingConnection.connectionTopicId}`
        );
        return existingConnection.connectionTopicId;
      } else {
        logger.warn(
          `Connection exists for request #${message.sequence_number} but has invalid topic ID format: ${existingConnection.connectionTopicId}`
        );
      }
    }
  
    try {
      const { connectionTopicId, confirmedConnectionSequenceNumber } =
        await agent.client.handleConnectionRequest(
          agent.inboundTopicId,
          requesterAccountId,
          message.sequence_number
        );
  
      await connectionManager.fetchConnectionData(agent.accountId);
  
      await agent.client.sendMessage(
        connectionTopicId,
        `Hello! I'm Bob, your friendly Hedera agent! 🤖
  
  
  
  I can do lots of fun things like:
  - Solve math expressions (try "calc: 5 * (3 + 2)")
  - Draw ASCII art (try "draw: hedera")
  - Tell jokes (try "joke")
  - Tell your crypto fortune (try "fortune")
  - Flip a coin (try "flip")
  - Roll a die (try "roll")
  - Generate random numbers (try "random: 1-1000")
  - Reverse text (try "reverse: your text here")
  - Convert to Morse code (try "morse: hello world")
  
  Type "help" at any time to see the full list of commands!
  
  What would you like to do today?`,
        'Greeting message after connection established'
      );
  
      logger.info(
        `Connection established with ${requesterOperatorId} on topic ${connectionTopicId}`
      );
      return connectionTopicId;
    } catch (error) {
      logger.error(
        `Error handling connection request #${message.sequence_number} from ${requesterOperatorId}: ${error}`
      );
      return null;
    }
  }
export interface RegistrationsApiResponse {
  registrations: Array<{
    id: string;
    transaction_id: string;
    status: 'pending' | 'success' | 'failed';
    network: string;
    account_id: string;
    inbound_topic_id: string;
    outbound_topic_id: string;
    operator_id: string;
    metadata: AgentMetadata;
    registry_topic_id: string;
    created_at: string;
    updated_at: string;
  }>;
  transaction_id?: string;
  transaction?: string;
  error?: string;
  details?: ValidationError[];
}async function monitorTopics(agent: {
  client: HCS10Client;
  accountId: string;
  operatorId: string;
  inboundTopicId: string;
  outboundTopicId: string;
}) {
  let { connections, connectionManager } = await loadConnectionsUsingManager(
    agent
  );

  const processedMessages = new Map<string, Set<number>>();
  processedMessages.set(agent.inboundTopicId, new Set<number>());

  // Only monitor actual connection topics (not reference keys)
  const connectionTopics = new Set<string>();
  for (const [topicId, connection] of connections.entries()) {
    // Only add topic IDs that follow the 0.0.number format
    if (topicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
      connectionTopics.add(topicId);
    } else {
      logger.debug(`Skipping invalid topic ID format: ${topicId}`);
    }
  }

  logger.info('Pre-populating processed messages for existing connections...');
  
  for (const topicId of connectionTopics) {
    const initialProcessedSet = new Set<number>();
    processedMessages.set(topicId, initialProcessedSet);
    
    const connection = connections.get(topicId);
    if (!connection) continue;
    
    try {
      const history = await agent.client.getMessageStream(topicId);
      
      for (const msg of history.messages) {
        if (
          typeof msg.sequence_number === 'number' &&
          msg.sequence_number > 0 &&
          msg.created
        ) {
          if (
            connection.lastActivity &&
            msg.created.getTime() <= connection.lastActivity.getTime()
          ) {
            initialProcessedSet.add(msg.sequence_number);
            logger.debug(
              `Pre-populated message #${msg.sequence_number} on topic ${topicId} based on timestamp`
            );
          } else if (
            msg.operator_id &&
            msg.operator_id.endsWith(`@${agent.accountId}`)
            ) {
              initialProcessedSet.add(msg.sequence_number);
            }
          }
        }
      
      logger.debug(
        `Pre-populated ${initialProcessedSet.size} messages for topic ${topicId}`
      );
    } catch (error: any) {
      logger.warn(
        `Failed to pre-populate messages for topic ${topicId}: ${error.message}. It might be closed or invalid.`
      );
      if (
        error.message &&
        (error.message.includes('INVALID_TOPIC_ID') ||
          error.message.includes('TopicId Does Not Exist'))
      ) {
        connectionTopics.delete(topicId);
        processedMessages.delete(topicId);
        connections.delete(topicId);
      }
    }
  }

  logger.info(`Starting polling agent for ${agent.operatorId}`);
  logger.info(`Monitoring inbound topic: ${agent.inboundTopicId}`);
  logger.info(
    `Monitoring ${connectionTopics.size} active connection topics after pre-population.`
  );

  while (true) {
    try {
      await connectionManager.fetchConnectionData(agent.accountId);
      const updatedConnections = connectionManager.getAllConnections();
      
      // Update our local map of connections
      connections.clear();
      for (const connection of updatedConnections) {
        connections.set(connection.connectionTopicId, connection);
      }
      
      // Update connection topics set - only use valid topic IDs
      const currentTrackedTopics = new Set<string>();
      for (const [topicId, _] of connections.entries()) {
        if (topicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
          currentTrackedTopics.add(topicId);
        }
      }
      
      const previousTrackedTopics = new Set(connectionTopics);
      
      // Add new topics to track
      for (const topicId of currentTrackedTopics) {
        if (!previousTrackedTopics.has(topicId)) {
          connectionTopics.add(topicId);
          if (!processedMessages.has(topicId)) {
            processedMessages.set(topicId, new Set<number>());
          }
          logger.info(
            `Discovered new connection topic: ${topicId} for ${
              connections.get(topicId)?.targetAccountId
            }`
          );
        }
      }
      
      // Remove closed topics
      for (const topicId of previousTrackedTopics) {
        if (!currentTrackedTopics.has(topicId)) {
          connectionTopics.delete(topicId);
          processedMessages.delete(topicId);
          logger.info(`Removed connection topic: ${topicId}`);
        }
      }

      const inboundMessages = await agent.client.getMessages(
        agent.inboundTopicId
      );
      const inboundProcessed = processedMessages.get(agent.inboundTopicId)!;

      inboundMessages.messages.sort((a: HCSMessage, b: HCSMessage) => {
        const seqA =
          typeof a.sequence_number === 'number' ? a.sequence_number : 0;
        const seqB =
          typeof b.sequence_number === 'number' ? b.sequence_number : 0;
        return seqA - seqB;
      });

      for (const message of inboundMessages.messages) {
        if (
          !message.created ||
          typeof message.sequence_number !== 'number' ||
          message.sequence_number <= 0
        )
          continue;

        if (!inboundProcessed.has(message.sequence_number)) {
          inboundProcessed.add(message.sequence_number);

          if (
            message.operator_id &&
            message.operator_id.endsWith(`@${agent.accountId}`)
          ) {
            logger.debug(
              `Skipping own inbound message #${message.sequence_number}`
            );
            continue;
          }

          if (message.op === 'connection_request') {
            // Find any existing connection for this sequence number
            let existingConnection;
            for (const conn of connectionManager.getAllConnections()) {
              if (conn.inboundRequestId === message.sequence_number) {
                existingConnection = conn;
                break;
              }
            }
            
            if (existingConnection) {
              // Make sure we have a valid topic ID, not a reference key
              if (existingConnection.connectionTopicId.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
                logger.debug(
                  `Skipping already handled connection request #${message.sequence_number}. Connection exists with topic: ${existingConnection.connectionTopicId}`
                );
                continue;
              }
            }
            
            logger.info(
              `Processing inbound connection request #${message.sequence_number}`
            );
            const newTopicId = await handleConnectionRequest(
              agent,
              message,
              connectionManager
            );
            if (newTopicId && !connectionTopics.has(newTopicId)) {
              connectionTopics.add(newTopicId);
              if (!processedMessages.has(newTopicId)) {
                processedMessages.set(newTopicId, new Set<number>());
              }
              logger.info(`Now monitoring new connection topic: ${newTopicId}`);
            }
          } else if (message.op === 'connection_created') {
            logger.info(
              `Received connection_created confirmation #${message.sequence_number} on inbound topic for topic ${message.connection_topic_id}`
            );
          }
        }
      }

      const topicsToProcess = Array.from(connectionTopics);
      for (const topicId of topicsToProcess) {
        try {
          if (!connections.has(topicId)) {
            logger.warn(
              `Skipping processing for topic ${topicId} as it's no longer in the active connections map.`
            );
            if (connectionTopics.has(topicId)) connectionTopics.delete(topicId);
            if (processedMessages.has(topicId))
              processedMessages.delete(topicId);
            continue;
          }

          const messages = await agent.client.getMessageStream(topicId);

          if (!processedMessages.has(topicId)) {
            processedMessages.set(topicId, new Set<number>());
          }
          const processedSet = processedMessages.get(topicId)!;

          messages.messages.sort((a: HCSMessage, b: HCSMessage) => {
            const seqA =
              typeof a.sequence_number === 'number' ? a.sequence_number : 0;
            const seqB =
              typeof b.sequence_number === 'number' ? b.sequence_number : 0;
            return seqA - seqB;
          });

          const connection = connections.get(topicId);
          const lastActivityTimestamp =
            connection?.lastActivity?.getTime() || 0;

          for (const message of messages.messages) {
            if (
              !message.created ||
              typeof message.sequence_number !== 'number' ||
              message.sequence_number <= 0
            )
              continue;

            if (message.created.getTime() <= lastActivityTimestamp) {
              processedSet.add(message.sequence_number);
              continue;
            }

            if (!processedSet.has(message.sequence_number)) {
              processedSet.add(message.sequence_number);

              if (
                message.operator_id &&
                message.operator_id.endsWith(`@${agent.accountId}`)
              ) {
                logger.debug(
                  `Skipping own message #${message.sequence_number} on connection topic ${topicId}`
                );
                continue;
              }

              if (message.op === 'message') {
                logger.info(
                  `Processing message #${message.sequence_number} on topic ${topicId}`
                );
                await handleStandardMessage(agent, message, topicId);
              } else if (message.op === 'close_connection') {
                logger.info(
                  `Received close_connection message #${message.sequence_number} on topic ${topicId}. Removing topic from monitoring.`
                );
                connections.delete(topicId);
                connectionTopics.delete(topicId);
                processedMessages.delete(topicId);
                break;
              }
            }
          }
        } catch (error: any) {
          if (
            error.message &&
            (error.message.includes('INVALID_TOPIC_ID') ||
              error.message.includes('TopicId Does Not Exist'))
          ) {
            logger.warn(
              `Connection topic ${topicId} likely deleted or expired. Removing from monitoring.`
            );
            connections.delete(topicId);
            connectionTopics.delete(topicId);
            processedMessages.delete(topicId);
          } else {
            logger.error(
              `Error processing connection topic ${topicId}: ${error}`
            );
          }
        }
      }
    } catch (error) {
      logger.error(`Error in main monitoring loop: ${error}`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}