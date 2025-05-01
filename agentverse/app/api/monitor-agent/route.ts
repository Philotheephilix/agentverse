// app/api/monitor-agent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  Client,
  AccountId,
  PrivateKey,
  TopicMessageQuery,
} from "@hashgraph/sdk";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
    const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(
      "302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207"
    );
    const data: Record<string, unknown> = await req.json();
    const topicId = data.topicId as string;
    const client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    console.log(`[MONITOR] Subscribing to topic: ${topicId}`);
    const startTime = new Date();
    console.log(`[MONITOR] Subscribing from time: ${startTime.toISOString()}`);

    // We'll store the response in a promise that resolves once a message is received
    return await new Promise<NextResponse>((resolve) => {
      new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(startTime)
        .subscribe(
          client,
          (error) => {
            console.error("[MONITOR] Subscription error:", error);
            resolve(NextResponse.json({ error: error ?? 'Unknown error' }, { status: 500 }));
          },
          (message) => {
            const content = Buffer.from(message.contents).toString("utf-8");
            console.log(typeof content);
            console.log(`[MONITOR] Message #${message.sequenceNumber}: ${content}`);
            resolve(NextResponse.json({ message: content }, { status: 200 }));
          }
        );
     
    });

  } catch (err) {
    return NextResponse.json(
      { error: err },
      { status: 500 }
    );
  }
}
