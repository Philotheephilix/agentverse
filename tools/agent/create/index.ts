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
  description: "Creates a new agent, registers it, and sets up a topic to listen/respond to prompts. Params: name, description, profilePictureUrl, tools (array of tool names)",
  func: async (input: any) => {
    try {
      let params = input;
      if (typeof input === "string") {
        params = JSON.parse(input);
      }
      const { name, description, profilePictureUrl, tools } = params;
      if (!name || !description || !profilePictureUrl || !tools) {
        return JSON.stringify({ error: "Missing required parameter. Required: name, description, profilePictureUrl, tools" });
      }
      const client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

      const createTopicTx = await new TopicCreateTransaction()
        .setSubmitKey(MY_PRIVATE_KEY)
        .setMaxTransactionFee(new Hbar(2))
        .execute(client);
      const receipt = await createTopicTx.getReceipt(client);
      const agentTopicId = receipt.topicId!.toString();
      const agentMetadata = {
        type: "agent",
        name,
        description,
        accountId: MY_ACCOUNT_ID.toString(),
        topicId: agentTopicId,
        profilePictureUrl,
        tools,
      };
      new TopicMessageQuery()
        .setTopicId(agentTopicId)
        .subscribe(client, null, async (msg) => {
          const prompt = Buffer.from(msg.contents).toString();

          const responseMessage = {
            type: "response",
            agent: name,
            prompt,
            answer: `Echo: ${prompt}`,
            timestamp: new Date().toISOString(),
          };
        });
      return JSON.stringify({ agentTopicId, agentMetadata });
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