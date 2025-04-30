// app/api/monitor-agent/route.ts

import { NextRequest } from "next/server";
import {
  Client,
  AccountId,
  PrivateKey,
  TopicMessageQuery,
} from "@hashgraph/sdk";
let hasSubscribed = false;

export async function GET(req: NextRequest) {
  try {
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
    const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(
      "302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207"
    );

    const client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    const topicId = "0.0.123456";
    console.log(`[MONITOR] Subscribing to topic: ${topicId}`);

    
    // We'll store the response in a promise that resolves once a message is received
    const extractedTopicId = await new Promise<string>((resolve, reject) => {
      new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0)
        .subscribe(
          client,
          (error) => {
            console.error("[MONITOR] Subscription error:", error);
            reject("Subscription error");
          },
          (message) => {
            const content = Buffer.from(message.contents).toString("utf-8");
            console.log(`[MONITOR] Message #${message.sequenceNumber}: ${content}`);

            
          }
        );

      // Optional timeout
      setTimeout(() => reject("Timeout: No message received"), 15000);
    });

    if (!extractedTopicId) {
      return new Response(JSON.stringify({ error: "No topicId found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ topicId: extractedTopicId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
