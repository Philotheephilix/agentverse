import { Client, TopicMessageQuery } from "@hashgraph/sdk";

import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../utils/constants";

export async function pollTopic(topicId: string) {
  console.log(`[MONITOR] pollTopic called for topic: ${topicId}`);

  const client = Client.forTestnet();
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  // Monitor only after server start time
  const startTime = new Date();
  console.log(`[MONITOR] Subscribing from time: ${startTime.toISOString()}`);

  new TopicMessageQuery()
    .setTopicId(topicId)
    .setStartTime(startTime)
    .subscribe(
      client,
      (error) => {
        console.error("[MONITOR] Error while polling topic:", error);
      },
      async (message) => {
        try {
          const content = Buffer.from(message.contents).toString("utf-8");
          console.log(
            `[MONITOR] Received message #${message.sequenceNumber}: ${content}`
          );

          // Call the LangChain agent API with the received message
          const axios = require('axios');
          let agentOutput;
          try {
            const response = await axios.post(
              'http://localhost:3000/api/ask',
              { prompt: content },
              { timeout: 15000 }
            );
            agentOutput = response.data?.output;
            if (typeof agentOutput !== 'string') {
              agentOutput = JSON.stringify(agentOutput);
            }
            console.log('[MONITOR] Agent output:', agentOutput);
          } catch (err) {
            console.error('[MONITOR] Error calling agent API:', err);
          }

        } catch (e) {
          console.error("[MONITOR] Error decoding message:", e, message);
        }
      }
    );

  console.log("[MONITOR] Subscription started for topic:", topicId);
}

process.on('uncaughtException', (err) => {
  console.error('[MONITOR] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[MONITOR] Unhandled Rejection:', reason);
});
