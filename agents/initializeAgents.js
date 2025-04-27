const path = require('path');
const fs = require('fs');

const agentsDir = path.join(__dirname, 'agents');

async function initializeAgents(agentContext = {}) {
  // Find all agent plugin index.js files
  const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folder of agentFolders) {
    const indexPath = path.join(agentsDir, folder, 'index.js');
    const pluginJsonPath = path.join(agentsDir, folder, 'plugin.json');
    let pluginJson = {};
    if (fs.existsSync(pluginJsonPath)) {
      try {
        pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
      } catch (e) {
        pluginJson = {};
      }
    }
    // If Hedera IDs are missing, register the agent
    const missingIds = !pluginJson.accountId || !pluginJson.privateKey || !pluginJson.inboundTopicId || !pluginJson.outboundTopicId;
    if (missingIds && fs.existsSync(indexPath)) {
      // Try to register the agent using RegisterAgentTool
      try {
        const { RegisterAgentTool } = require(path.join(__dirname, 'RegisterAgentTool'));
        // You must replace this with your actual HCS10Client instance and config
        const hcs10Client = agentContext.hcs10Client || {};
        const registerTool = new RegisterAgentTool(hcs10Client);
        const resultStr = await registerTool._call({ name: pluginJson.name || folder });
        let result;
        try { result = JSON.parse(resultStr); } catch (e) { result = null; }
        if (result && result.accountId && result.privateKey && result.inboundTopicId && result.outboundTopicId) {
          pluginJson.accountId = result.accountId;
          pluginJson.privateKey = result.privateKey;
          pluginJson.inboundTopicId = result.inboundTopicId;
          pluginJson.outboundTopicId = result.outboundTopicId;
          fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }
      } catch (e) {
        // Could not auto-register agent
      }
    }
    if (fs.existsSync(indexPath)) {
      const agentModule = require(indexPath);
      // Support both default and named exports
      const plugins = [];
      if (agentModule && typeof agentModule === 'object') {
        for (const key in agentModule) {
          if (typeof agentModule[key] === 'function') {
            // Try to instantiate if it's a plugin class
            try {
              const plugin = new agentModule[key]();
              if (typeof plugin.onLoad === 'function') {
                await plugin.onLoad(agentContext);
              }
              plugins.push(plugin);
            } catch (e) {
              // skip if not a plugin class
            }
          }
        }
      }
    }
  }
}

module.exports = { initializeAgents };
