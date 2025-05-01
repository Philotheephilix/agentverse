import { Client, TopicMessageQuery } from "@hashgraph/sdk";
import { AccountId, PrivateKey } from "@hashgraph/sdk";

export const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
export const MY_PRIVATE_KEY = PrivateKey.fromStringED25519("302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");

const client = Client.forTestnet();
client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

const topicId = "0.0.5932000";

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
