import { initializeHCS10Agents } from './agents/initializeHCS10Agents.js';
import dotenv from 'dotenv';
import { Logger } from '@hashgraphonline/standards-sdk';

// Load environment variables
dotenv.config();

// Configure logger
const logger = Logger.getInstance({
  module: 'AgentLauncher',
  level: 'debug',
});

/**
 * Main function to initialize and monitor all agents
 */
async function launchAllAgents() {
  try {
    logger.info('🚀 Starting the AgentVerse agent initialization process...');
    
    // Check for required environment variables
    const requiredEnvVars = ['HEDERA_OPERATOR_ID', 'HEDERA_PRIVATE_KEY', 'HEDERA_NETWORK'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      logger.info('Please check your .env file and try again.');
      process.exit(1);
    }
    
    // Initialize HCS10 agents (hotel, food, flight)
    logger.info('🔄 Initializing HCS10 agents with auto-connect functionality...');
    await initializeHCS10Agents();
    logger.info('✅ All agents initialized successfully!');
    
    // Keep the process running
    logger.info('🔄 Agents are now running and auto-accepting connections');
    logger.info('🔄 Press Ctrl+C to stop the agent processes');
    
    // Set up process termination handler
    process.on('SIGINT', () => {
      logger.info('👋 Received termination signal. Shutting down agents...');
      // Allow time for cleanup logs to be displayed
      setTimeout(() => {
        logger.info('✅ Agent processes terminated successfully');
        process.exit(0);
      }, 1000);
    });
    
    // Log regular status updates
    setInterval(() => {
      logger.info('💓 Agents are still running and monitoring for connections and messages');
    }, 300000); // Every 5 minutes
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Error during agent initialization: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the launcher
launchAllAgents().catch(error => {
  console.error('Unhandled error in agent launcher:', error);
  process.exit(1);
});
