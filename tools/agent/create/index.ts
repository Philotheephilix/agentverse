import {
    Client,
    AccountId,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    Hbar,
  } from "@hashgraph/sdk";
  
  import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../../utils/constants";

  const client = Client.forTestnet();
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
  
module.exports = {
  name: "create_agent",
  description: "Creates a new agent, registers it, Params: name, description, profilePictureUrl, tools (array of tool names)",
  func: async (input: any) => {
    try {
      let params = input;
      if (typeof input === "string") {
        params = JSON.parse(input);
      }
      const { name, description, profilePictureUrl, tools } = params;
      if (!name || !description) {
        return JSON.stringify({ error: "Missing required parameter. Required: name, description" });
      }
      const client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

      const createTopicTx = await new TopicCreateTransaction()
        .setSubmitKey(MY_PRIVATE_KEY)
        .setMaxTransactionFee(new Hbar(2))
        .execute(client);
      const receipt = await createTopicTx.getReceipt(client);
      const agentTopicId = receipt.topicId!.toString();
      const agentMetadata: any = {
        type: "agent",
        name,
        description,
        accountId: MY_ACCOUNT_ID.toString(),
        topicId: agentTopicId,
      };
      if (profilePictureUrl) agentMetadata.profilePictureUrl = profilePictureUrl;
      if (tools) agentMetadata.tools = tools;
      return JSON.stringify({ agentMetadata });
    } catch (err: any) {
      return JSON.stringify({ error: err.message || String(err) });
    }
  },
  schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Agent name" },
      description: { type: "string", description: "Agent description" },
      profilePictureUrl: { type: "string", description: "URL for agent avatar" },
      tools: { type: "array", items: { type: "string" }, description: "Array of tool names" },
    },
    required: ["name", "description", "profilePictureUrl", "tools"],
  },
};