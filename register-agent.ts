#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { AIAgentCapability } from '@hashgraphonline/standards-sdk';
import { initializeHCS10Client } from './lib/init';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to prompt for user input
const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

// Helper function to display agent capabilities for selection
function displayCapabilities() {
  console.log('=== Available Agent Capabilities ===');
  console.log('  0: TEXT_GENERATION - Generate coherent, human-like text');
  console.log('  1: IMAGE_GENERATION - Create visual content based on prompts');
  console.log('  2: AUDIO_GENERATION - Synthesize speech, music, or soundscapes');
  console.log('  3: VIDEO_GENERATION - Produce dynamic visual content');
  console.log('  4: CODE_GENERATION - Produce code based on text prompts');
  console.log('  5: LANGUAGE_TRANSLATION - Convert text between languages');
  console.log('  6: SUMMARIZATION_EXTRACTION - Distill content into concise summaries');
  console.log('  7: KNOWLEDGE_RETRIEVAL - Access and reason with structured data');
  console.log('  8: DATA_INTEGRATION - Aggregate and visualize data sources');
  console.log('  9: MARKET_INTELLIGENCE - Analyze financial and economic data');
  console.log(' 10: TRANSACTION_ANALYTICS - Monitor and analyze transactions');
  console.log(' 11: SMART_CONTRACT_AUDIT - Evaluate decentralized code');
  console.log(' 12: GOVERNANCE_FACILITATION - Support decentralized decision-making');
  console.log(' 13: SECURITY_MONITORING - Detect and respond to security threats');
  console.log(' 14: COMPLIANCE_ANALYSIS - Ensure regulatory adherence');
  console.log(' 15: FRAUD_DETECTION - Identify and mitigate fraudulent activities');
  console.log(' 16: MULTI_AGENT_COORDINATION - Enable collaboration between agents');
  console.log(' 17: API_INTEGRATION - Connect with external systems and services');
  console.log(' 18: WORKFLOW_AUTOMATION - Automate routine tasks and processes');
}

// Main function to register a new agent
async function registerNewAgent() {
  try {
    console.log('\n=== Agent Registration ===');
    
    // 1. Initialize HCS10 client with the operator account
    console.log('Initializing HCS10 client...');
    console.log('HEDERA_OPERATOR_ID:', process.env.HEDERA_OPERATOR_ID);
    console.log('HEDERA_PRIVATE_KEY available:', !!process.env.HEDERA_PRIVATE_KEY);
    console.log('HEDERA_OPERATOR_KEY available:', !!process.env.HEDERA_OPERATOR_KEY);
    console.log('HEDERA_NETWORK:', process.env.HEDERA_NETWORK);
    
    const { tools, hcs10Client } = initializeHCS10Client({
      clientConfig: {
        logLevel: 'debug'
      }
    });
    
    console.log('HCS10 client initialized');
    console.log('Network:', hcs10Client.getNetwork());
    console.log('Operator ID:', hcs10Client.getOperatorId());
    
    // 2. Get agent details from user
    const agentName = await question('Enter agent name: ');
    
    if (!agentName.trim()) {
      console.error('Agent name is required!');
      rl.close();
      return;
    }
    
    const agentDescription = await question('Enter agent description (optional): ');
    
    // 3. Agent type
    console.log('\nAgent Type:');
    console.log('  1: Autonomous (default)');
    console.log('  2: Manual');
    const typeChoice = await question('Choose agent type [1-2, default: 1]: ');
    const agentType = typeChoice === '2' ? 'manual' : 'autonomous';
    
    // 4. Agent capabilities
    displayCapabilities();
    const capabilitiesInput = await question('Enter capability numbers (comma-separated, default: 0): ');
    
    let capabilities: number[] = [AIAgentCapability.TEXT_GENERATION];
    if (capabilitiesInput.trim()) {
      capabilities = capabilitiesInput
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n >= 0 && n <= 18);
      
      if (capabilities.length === 0) {
        capabilities = [AIAgentCapability.TEXT_GENERATION];
      }
    }
    
    // 5. Profile picture (optional)
    const profilePicture = await question('Enter profile picture path or URL (optional): ');
    
    // 6. Fee configuration (optional)
    const configureFees = await question('Configure fees for this agent? (y/n, default: n): ');
    
    let hbarFee: number | undefined;
    let tokenFee: { amount: number; tokenId: string } | undefined;
    
    if (configureFees.toLowerCase() === 'y') {
      const hbarFeeInput = await question('Enter HBAR fee amount (leave blank for none): ');
      if (hbarFeeInput.trim()) {
        const fee = parseFloat(hbarFeeInput);
        if (!isNaN(fee) && fee > 0) {
          hbarFee = fee;
        }
      }
      
      const configureTokenFee = await question('Configure token fee? (y/n, default: n): ');
      if (configureTokenFee.toLowerCase() === 'y') {
        const tokenIdInput = await question('Enter token ID (e.g., 0.0.1234): ');
        const tokenAmountInput = await question('Enter token amount: ');
        
        if (tokenIdInput.trim() && tokenAmountInput.trim()) {
          const amount = parseFloat(tokenAmountInput);
          if (!isNaN(amount) && amount > 0) {
            tokenFee = {
              amount,
              tokenId: tokenIdInput.trim()
            };
          }
        }
      }
    }
    
    // 7. Environment variable persistence
    const envPrefix = await question('Enter prefix for environment variables (default: AGENT): ');
    
    // 8. Build registration parameters
    const registrationParams: any = {
      name: agentName,
      type: agentType,
      capabilities,
      setAsCurrent: true,
      persistence: {
        prefix: envPrefix.trim() || 'AGENT'
      }
    };
    
    if (agentDescription.trim()) {
      registrationParams.description = agentDescription;
    }
    
    if (profilePicture.trim()) {
      registrationParams.profilePicture = profilePicture;
    }
    
    if (hbarFee !== undefined) {
      registrationParams.hbarFee = hbarFee;
    }
    
    if (tokenFee !== undefined) {
      registrationParams.tokenFee = tokenFee;
    }
    
    console.log('\nRegistering agent with these parameters:');
    console.log(JSON.stringify(registrationParams, null, 2));
    
    const confirm = await question('\nProceed with registration? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Registration cancelled.');
      rl.close();
      return;
    }
    
    // 9. Register the agent
    console.log('\nRegistering agent...');
    try {
      console.log('Calling register_agent tool with params:', JSON.stringify(registrationParams, null, 2));
      let registrationResult;
      try {
        registrationResult = await tools.registerAgentTool.invoke(registrationParams);
        console.log('Raw registration result:', registrationResult);
      } catch (invokeError) {
        console.error('Error invoking registration tool:', invokeError);
        throw invokeError;
      }
      
      let resultObj;
      try {
        resultObj = JSON.parse(registrationResult);
        console.log('Parsed result object:', JSON.stringify(resultObj, null, 2));
      } catch (parseError) {
        console.error('Error parsing registration result:', parseError);
        console.log('Raw result was:', registrationResult);
        throw new Error('Failed to parse registration result');
      }
      
      if (resultObj.success) {
        console.log('\n✅ Agent registered successfully!');
        console.log('=== Agent Details ===');
        console.log(`Name: ${resultObj.name}`);
        console.log(`Account ID: ${resultObj.accountId}`);
        console.log(`Private Key: ${resultObj.privateKey}`);
        console.log(`Inbound Topic ID: ${resultObj.inboundTopicId}`);
        console.log(`Outbound Topic ID: ${resultObj.outboundTopicId}`);
        console.log(`Profile Topic ID: ${resultObj.profileTopicId}`);
        
        console.log('\nThese details have been saved to your .env file with the prefix:', 
                    registrationParams.persistence.prefix);
      } else {
        console.error('\n❌ Registration failed:', resultObj.message);
      }
    } catch (error) {
      console.error('\n❌ Registration error:', error);
    }
  } catch (error) {
    console.error('Error during agent registration:', error);
  } finally {
    rl.close();
  }
}

// Run the registration process
registerNewAgent().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
