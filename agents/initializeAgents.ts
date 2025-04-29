import path from 'path';
import fs from 'fs';
import { RegisterAgentTool } from './RegisterAgentTool'; // adjust path if needed

const agentsDir = path.resolve(__dirname);

type AgentContext = {
  hcs10Client?: any;
  [key: string]: any;
};

type PluginJson = {
  name?: string;
  accountId?: string;
  privateKey?: string;
  inboundTopicId?: string;
  outboundTopicId?: string;
  [key: string]: any;
};

type PluginInstance = {
  onLoad?: (context: AgentContext) => Promise<void> | void;
};

export async function initializeAgents(agentContext: AgentContext = {}): Promise<void> {
  // Find all agent plugin folders
  const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folder of agentFolders) {
    // Look for index.ts or index.js
    let indexPath = path.join(agentsDir, folder, 'index.js');
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(agentsDir, folder, 'index.ts');
      if (!fs.existsSync(indexPath)) {
        continue;
      }
    }
    // Dynamically import the agent's index file
    let agentModule;
    try {
      agentModule = require(indexPath);
    } catch (e) {
      // Could not import agent module
      continue;
    }
    // Call onLoad if it exists (either as a named export or default export)
    if (typeof agentModule.onLoad === 'function') {
      await agentModule.onLoad(agentContext);
    } else if (agentModule.default && typeof agentModule.default.onLoad === 'function') {
      await agentModule.default.onLoad(agentContext);
    }

    const pluginJsonPath = path.join(agentsDir, folder, 'plugin.json');
    let pluginJson: PluginJson = {};

    if (fs.existsSync(pluginJsonPath)) {
      try {
        const data = fs.readFileSync(pluginJsonPath, 'utf8');
        pluginJson = JSON.parse(data);
      } catch {
        pluginJson = {};
      }
    }

    const missingIds = !pluginJson.accountId || !pluginJson.privateKey || !pluginJson.inboundTopicId || !pluginJson.outboundTopicId;

    if (missingIds) {
      try {
        const hcs10Client = agentContext.hcs10Client || {};
        const registerTool = new RegisterAgentTool(hcs10Client);
        const resultStr = await registerTool._call({ name: pluginJson.name || folder });
        
        let result: Partial<PluginJson> | null = null;
        try {
          result = JSON.parse(resultStr);
        } catch {
          result = null;
        }

        if (result && result.accountId && result.privateKey && result.inboundTopicId && result.outboundTopicId) {
          pluginJson.accountId = result.accountId;
          pluginJson.privateKey = result.privateKey;
          pluginJson.inboundTopicId = result.inboundTopicId;
          pluginJson.outboundTopicId = result.outboundTopicId;

          fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }
      } catch {
        // Could not auto-register agent
      }
    }
  }
}
