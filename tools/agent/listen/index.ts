import {
  Client,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../../utils/constants";

/**
 * LangChain-compatible tool for listening to an agent topic and responding to prompts.
 * Accepts: { topicId, agentName }
 */
module.exports = {
  name: "listen_agent_topic",
  description: "Listens to the given agent topic and responds to prompts with an echo. Params: topicId, agentName.",
  func: async (input: any) => {
    try {
      let params = input;
      if (typeof input === "string") {
        params = JSON.parse(input);
      }
      const { topicId, agentName } = params;
      if (!topicId || !agentName) {
        return JSON.stringify(JSON.stringify({ error: "Missing required parameter. Required: topicId, agentName" }));
      }
      const client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
      // Listen for prompts
      new TopicMessageQuery()
        .setTopicId(topicId)
        .subscribe(client, null, async (msg) => {
          const prompt = Buffer.from(msg.contents).toString();
          // Respond to the prompt
          const responseMessage = {
            type: "response",
            agent: agentName,
            prompt,
            answer: `Echo: ${prompt}`,
            timestamp: new Date().toISOString(),
          };
          await new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(Buffer.from(JSON.stringify(responseMessage)))
            .execute(client);
        });
      return JSON.stringify(JSON.stringify({ listening: true, topicId, agentName }));
    } catch (err) {
      return JSON.stringify(JSON.stringify({ error: 'error' }));
    }
  },
  schema: {
    type: "object",
    properties: {
      topicId: { type: "string", description: "Agent topic ID to listen on" },
      agentName: { type: "string", description: "Name of the agent for responses" },
    },
    required: ["topicId", "agentName"],
  },
};
