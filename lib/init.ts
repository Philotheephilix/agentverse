import { HCS10Client, StandardNetworkType } from './hcs10/HCS10Client';
import { RegisterAgentTool } from './tools/RegisterAgentTool';
import { IStateManager } from './state/state-types';
import { OpenConvaiState } from './state/open-convai-state';
import { Logger } from '@hashgraphonline/standards-sdk';
import { ENV_FILE_PATH } from './utils/state-tools';

export interface HCS10ClientConfig {
  operatorId?: string;
  operatorKey?: string;
  network?: StandardNetworkType;
  useEncryption?: boolean;
  registryUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface HCS10Tools {
  registerAgentTool: RegisterAgentTool;
  connectionMonitorTool: any;
  checkMessagesTool: any;
  sendMessageToConnectionTool: any;
  checkConnectionsTool: any;
  acceptConnectionRequestTool: any;
}

export interface HCS10InitializationOptions {
  clientConfig?: HCS10ClientConfig;
  stateManager?: IStateManager;
}

/**
 * Initializes the HCS10 client and returns pre-registered tools.
 *
 * @param options - Initialization options
 * @returns Object containing hcs10Client and requested tools
 */
export function initializeHCS10Client(options?: HCS10InitializationOptions): {
  hcs10Client: HCS10Client;
  tools: HCS10Tools;
  stateManager: IStateManager;
} {
  // Set up the configuration
  const config = options?.clientConfig || {};

  // Use environment variables as fallbacks if not explicitly provided
  const operatorId = config.operatorId || process.env.HEDERA_OPERATOR_ID;
  const operatorPrivateKey =
    config.operatorKey || process.env.HEDERA_PRIVATE_KEY || process.env.HEDERA_OPERATOR_KEY;

  // Get network from config or env, default to testnet
  const networkEnv = config.network || process.env.HEDERA_NETWORK || 'testnet';

  // Validate and cast network type
  let network: StandardNetworkType;
  if (networkEnv === 'mainnet') {
    network = 'mainnet';
  } else if (networkEnv === 'testnet') {
    network = 'testnet';
  } else {
    console.warn(
      `Unsupported network specified: '${networkEnv}'. Defaulting to 'testnet'.`
    );
    network = 'testnet'; // Default to testnet if invalid/unsupported
  }

  if (!operatorId || !operatorPrivateKey) {
    throw new Error(
      'Operator ID and private key must be provided either through options or environment variables.'
    );
  }

  // Set up logging
  const logger = Logger.getInstance({
    level: config.logLevel || 'info',
  });

  // Create or use provided state manager
  const stateManager =
    options?.stateManager ||
    new OpenConvaiState({
      defaultEnvFilePath: ENV_FILE_PATH,
      defaultPrefix: 'AGENT', // Default prefix for agent variables
    });
  logger.info('State manager initialized');

  // Instantiate primary HCS10Client
  const hcs10Client = new HCS10Client(operatorId, operatorPrivateKey, network, {
    useEncryption: config.useEncryption,
    registryUrl: config.registryUrl,
  });
  logger.info(`HCS10Client initialized for ${operatorId} on ${network}`);

  // Initialize the tools
  const tools: HCS10Tools = {
    registerAgentTool: new RegisterAgentTool(hcs10Client),
    connectionMonitorTool: { invoke: async (params: any) => ({}) },
    checkMessagesTool: { invoke: async (params: any) => "[]" },
    sendMessageToConnectionTool: { invoke: async (params: any) => ({}) },
    checkConnectionsTool: { invoke: async (params: any) => ({}) },
    acceptConnectionRequestTool: { invoke: async (params: any) => ({}) }
  };

  return {
    hcs10Client,
    tools,
    stateManager,
  };
}
