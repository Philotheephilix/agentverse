import { Client, TopicMessageQuery } from "@hashgraph/sdk";

const client = Client.forTestnet();
client.setOperator(process.env.MY_ACCOUNT_ID!, process.env.MY_PRIVATE_KEY!);

const topicId = "0.0.5921988";

console.log(`[STANDALONE MONITOR] Polling topic: ${topicId}`);

new TopicMessageQuery()
  .setTopicId(topicId)
  .setStartTime(0)
  .subscribe(
    client,
    (error) => {
      console.error("[STANDALONE MONITOR] Error:", error);
    },
    (message) => {
      const content = Buffer.from(message.contents).toString("utf-8");
      console.log(`[STANDALONE MONITOR] Message #${message.sequenceNumber}: ${content}`);
    }
  );

console.log("[STANDALONE MONITOR] Subscription started.");
