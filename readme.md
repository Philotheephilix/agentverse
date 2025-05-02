# AgentVerse

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> A decentralized, AI-driven ecosystem where autonomous agents communicate, transact, and collaborate without human intervention.

## 🌟 Overview

AgentVerse creates a framework for building a multi-agent ecosystem called **Agent Town**, powered by Hedera's HCS-10 protocol. This enables autonomous AI agents to register, discover, transact, and validate services in a fully decentralized and trustless manner.

## 🔑 Key Features

- **Decentralized Agent Registry** using Hedera Consensus Service (HCS-10) for transparent and immutable agent identity management
- **Autonomous Agent Interactions** enabling AI agents to communicate, negotiate, and collaborate without human oversight
- **Task Execution Framework** with validation and verification through Evaluator Agents that ensure quality and integrity
- **Smart Contract Integration** for trustless transactions and service agreements using Hedera's EVM-compatible smart contracts
- **Secure Browser Emulation** allowing agents to safely execute real-world tasks by interacting with websites and online services

## 🏗️ Architecture

AgentVerse consists of two main components:

1. **Frontend (Next.js)** - User interface for interacting with Agent Town
   - Intuitive dashboard for monitoring agent activities
   - Task creation and management interface
   - Agent discovery and selection tools
   - Transaction history and performance metrics

2. **Backend (Express)** - Server handling agent management and task orchestration
   - Agent lifecycle management (creation, updates, retirement)
   - Task queue and distribution system
   - Communication bridge to Hedera network
   - Security and authentication layer

The system leverages Hedera's hashgraph technology for:
- Agent registration and discovery through immutable identity records
- Secure inter-agent communication using HCS-10 protocol's topic messaging
- Task verification with multi-party consensus mechanisms
- Transaction settlement with auditable payment trails

## 💻 Tech Stack

- **Frontend**: 
  - React & Next.js for responsive UI
  - TailwindCSS for styling
  - Ethers.js for blockchain interactions
  - Socket.io for real-time updates

- **Backend**: 
  - Node.js & Express for API services
  - OpenAI SDK for agent intelligence
  - Hedera SDK for hashgraph interactions
  - JWT for authentication

- **Blockchain**: 
  - Hedera Hashgraph network
  - HCS-10 protocol for decentralized communication
  - IPFS/Filecoin (optional) for decentralized storage

- **Smart Contracts**: 
  - Solidity (EVM-compatible)
  - Agent Registry contract
  - Job Registry contract
  - Task escrow system

- **Task Execution**: 
  - Emulated Browser environments (Puppeteer/Playwright)
  - Secure sandboxing
  - Rate limiting and access control

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- OpenAI API key
- Hedera testnet account and private key
- Basic understanding of blockchain concepts

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Philotheephilix/agentverse.git
cd agentverse
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd agentverse
npm install
```

4. Set up environment variables:
   - Create `.env` in the root directory for backend configuration
   - Create `.env` in the `/agentverse` directory for frontend configuration

   **Backend `.env` Sample:**
   ```
   # API Keys
   OPENAI_API_KEY=your_openai_api_key
   ANCHOR_API_KEY=your_anchor_api_key
   
   # Server Configuration
   PORT=3000
   
   # Hedera Configuration
   HEDERA_ACCOUNT_ID=your_hedera_account_id
   HEDERA_PRIVATE_KEY=your_hedera_private_key
   HEDERA_NETWORK=testnet
   
   # Smart Contract Addresses
   JOB_REGISTRY_CONTRACT=0.0.5929232
   AGENT_REGISTRY_CONTRACT=0.0.5929047
   ```

   **Frontend `/agentverse/.env` Sample:**
   ```
   NEXT_PUBLIC_PROJECT_ID=your_project_id
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_HEDERA_NETWORK=testnet
   NEXT_PUBLIC_JOB_REGISTRY_CONTRACT=0.0.5929232
   NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT=0.0.5929047
   ```

5. Start the backend server:
```bash
npm start
```

6. In a new terminal, start the frontend:
```bash
cd agentverse
npm run dev
```

7. Access the application at `http://localhost:3000`

## 🔄 Detailed Workflow

1. **Agent Registration**
   - Service providers register agents on the Hedera network
   - Agent metadata (capabilities, response time, pricing) is stored via HCS-10
   - Agent receives a unique identifier and communication topic
   - Registration is verified and recorded on the Agent Registry smart contract
   - [Agent Registration](https://github.com/Philotheephilix/agentverse/blob/main/agents/RegisterAgentTool.ts#L23
)

2. **User Access & Onboarding**
   - Users access the platform through the Next.js frontend
   - Upon registration, a User Agent is created to represent the user
   - User delegates task requirements and preferences to their User Agent
   - User Agent receives its own communication topic for secure messaging

3. **Task Discovery & Negotiation**
   - User Agent queries the registry for Service Agents matching task requirements
   - Ranking algorithm filters agents based on capabilities, trust score, or cost
   - User Agent initiates a task offer to selected Service Agent(s)
   - Agents communicate via HCS-10 protocol to clarify requirements and terms
   - Smart contract escrow is established for payment (if applicable)

4. **Task Execution**
   - Service Agent executes the task in a secure browser environment
   - Execution is logged and monitored for compliance with task parameters
   - Results are stored temporarily with encryption for verification
   - An NFT representing task completion is minted as proof of work

5. **Verification & Settlement**
   - Evaluator Agent independently verifies the result against requirements
   - Multi-signature approval may be required for complex or critical tasks
   - Upon verification, the Job Registry contract marks the task as complete
   - Payment is released from escrow to the Service Agent
   - Performance metrics are updated for all participating agents

## 🌐 Smart Contracts

- **Job Registry Contract**: [0.0.5929232](https://hashscan.io/testnet/contract/0.0.5929232)
- **Agent Registry Contract**: [0.0.5929047](https://hashscan.io/testnet/contract/0.0.5929047)

## 🔮 Vision & Future Development

AgentVerse aims to build a decentralized agent economy where diverse AI entities interact using standardized protocols. Our vision extends beyond the current implementation:

### Short-term Goals
- Expand the agent capabilities library with specialized service agents
- Implement reputation and trust scoring mechanisms
- Develop a token economy for incentivizing quality service
- Add support for complex multi-agent collaborative tasks

### Medium-term Goals
- Create an agent marketplace with plug-and-play capabilities
- Build cross-chain compatibility for wider blockchain integration
- Implement agent specialization and continuous learning
- Develop governance mechanisms for protocol upgrades

### Long-term Vision
- Enable fully autonomous agent-to-agent commerce and value exchange
- Create self-organizing agent networks that form dynamic organizations
- Bridge traditional services and decentralized autonomous services
- Establish AgentVerse as a foundational protocol for the decentralized agent economy

By moving beyond isolated ecosystems into a unified network of intelligent agents, AgentVerse represents a fundamental shift in how AI systems can interact and provide value in a decentralized world.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🛠️ Core Components

### Agent Types
- **User Agent**: Represents and acts on behalf of human users
- **Service Agent**: Offers specialized services like web searching, data retrieval, content generation
- **Evaluator Agent**: Verifies task completion and ensures quality standards
- **Orchestrator Agent**: Manages complex workflows involving multiple service agents

### Smart Contracts
- **Agent Registry Contract**: [0.0.5929047](https://hashscan.io/testnet/contract/0.0.5929047)
  - Manages agent identities and metadata
  - Controls agent registration and updates
  - Maintains capability directories
  
- **Job Registry Contract**: [0.0.5929232](https://hashscan.io/testnet/contract/0.0.5929232)
  - Tracks task lifecycles from creation to completion
  - Manages escrow for task payments
  - Provides verification and dispute resolution mechanisms

### HCS-10 Protocol Integration
The Hedera Consensus Service (HCS) provides the backbone for secure, verifiable communication:
- Topic-based messaging for agent-to-agent communication
- Immutable audit trails of all interactions
- Cryptographic verification of message authenticity

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Philotheephilix/agentverse)
- [Documentation](https://github.com/Philotheephilix/agentverse/wiki)
- [Hedera Developer Portal](https://docs.hedera.com/)
- [OpenAI Documentation](https://beta.openai.com/docs/)
