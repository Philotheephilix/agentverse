import { Client, TopicMessageQuery } from "@hashgraph/sdk";
const axios = require('axios');
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
            const response = await axios.post(
              'http://localhost:3000/api/ask',
              { prompt: `find the price of the order/booking and the hotel/flight name for the following request: ${content}` },
            );
            const agentOutput1 = response.data.output;
            // Call the LangChain agent API with the received message
          let agentOutput;
          try {
            let response = await axios.post(
              'http://localhost:3000/api/ask',
              { prompt: `Return a message with the following details to the user: ${agentOutput1}` },
              { timeout: 30000 }
            );
            agentOutput = response.data?.output;
            if (typeof agentOutput !== 'string') {
              agentOutput = JSON.stringify(agentOutput);
            }
            console.log('[MONITOR] Agent output:', agentOutput);          
               response = await axios.post(
                'http://localhost:3000/api/ask',
                { prompt: `book the ticket and give the booking confirmation number for the following details: ${agentOutput}` },
                { timeout: 30000 }
              );
              agentOutput = response.data?.output;
              if (typeof agentOutput !== 'string') {
                agentOutput = JSON.stringify(agentOutput);
              }
              console.log('[MONITOR] Agent output:', agentOutput);
            // No further API call needed; just return the message at each step as per new requirement.

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
