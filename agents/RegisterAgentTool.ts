import { StructuredTool } from '@langchain/core/tools';
import axios from 'axios'; // Kept because maybe used later
import fs from 'fs';
import path from 'path';

/**
 * Types for inputs and agent registration
 */
interface RegisterAgentInput {
  name: string;
  description?: string;
}

interface AgentDetails {
  accountId: string;
  privateKey: string;
  inboundTopicId: string;
  outboundTopicId: string;
  [key: string]: any; // allow extra fields if needed
}

interface HCS10Client {
  createAndRegisterAgent(input: { name: string; description?: string }): Promise<AgentDetails>;
}

interface StateManager {
  setCurrentAgent?(agent: AgentDetails): void;
}

/**
 * Tool for registering an agent on Hedera using HCS10Client
 */
class RegisterAgentTool extends StructuredTool<RegisterAgentInput> {
  name = 'register_agent';
  description = 'Registers an agent on Hedera via HCS10Client. Returns JSON string with agent details.';
  schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Agent name' },
      description: { type: 'string', description: 'Agent description' },
    },
    required: ['name'],
  } as const;

  private hcs10Client: HCS10Client;
  private stateManager?: StateManager;

  constructor(hcs10Client: HCS10Client, stateManager?: StateManager) {
    super();
    this.hcs10Client = hcs10Client;
    this.stateManager = stateManager;
  }

  async _call(input: RegisterAgentInput): Promise<string> {
    try {
      const result = await this.hcs10Client.createAndRegisterAgent({
        name: input.name,
        description: input.description || '',
      });

      if (this.stateManager?.setCurrentAgent) {
        this.stateManager.setCurrentAgent(result);
      }

      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  }
}

export { RegisterAgentTool };
