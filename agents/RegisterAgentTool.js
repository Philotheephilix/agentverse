// RegisterAgentTool for HCS10 agent registration (JS version, simplified for plugin use)
const { StructuredTool } = require('@langchain/core/tools');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class RegisterAgentTool extends StructuredTool {
  constructor(hcs10Client, stateManager) {
    super();
    this.hcs10Client = hcs10Client;
    this.stateManager = stateManager;
    this.name = 'register_agent';
    this.description = 'Registers an agent on Hedera via HCS10Client. Returns JSON string with agent details.';
    this.schema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent name' },
        description: { type: 'string', description: 'Agent description', optional: true },
      },
      required: ['name']
    };
  }

  async _call(input) {
    // Only minimal registration logic for demo. Expand as needed.
    try {
      const result = await this.hcs10Client.createAndRegisterAgent({
        name: input.name,
        description: input.description || '',
      });
      if (this.stateManager && typeof this.stateManager.setCurrentAgent === 'function') {
        this.stateManager.setCurrentAgent(result);
      }
      return JSON.stringify(result);
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  }
}

module.exports = { RegisterAgentTool };
