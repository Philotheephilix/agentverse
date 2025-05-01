// app/api/monitor-agent/route.ts

import { NextRequest } from "next/server";
import {
  Client,
  AccountId,
  PrivateKey,
  TopicMessageQuery,
} from "@hashgraph/sdk";
let hasSubscribed = false;

export async function POST(req: NextRequest) {
  try {
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
    const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(
      "302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207"
    );
    const { topicId } = await req.json();
    const client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    console.log(`[MONITOR] Subscribing to topic: ${topicId}`);
    const startTime = new Date();
  console.log(`[MONITOR] Subscribing from time: ${startTime.toISOString()}`);

    
    // We'll store the response in a promise that resolves once a message is received
    const extractedTopicId = await new Promise<string>((resolve, reject) => {
      new TopicMessageQuery()
        .setTopicId("0.0.5921988")
        .setStartTime(startTime)
        .subscribe(
          client,
          (error) => {
            console.error("[MONITOR] Subscription error:", error);
            reject("Subscription error");
          },
          (message) => {
            const content = Buffer.from(message.contents).toString("utf-8");
            console.log(typeof content);
            console.log(`[MONITOR] Message #${message.sequenceNumber}: ${content}`);

            
          }
        );

      // Optional timeout
     
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
