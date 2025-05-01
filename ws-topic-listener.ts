import { Server } from 'ws';
import { Client, TopicMessageQuery, AccountId, PrivateKey } from "@hashgraph/sdk";
import dotenv from 'dotenv';
dotenv.config();

const MY_ACCOUNT_ID = AccountId.fromString(process.env.MY_ACCOUNT_ID || "0.0.5864744");
const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY || "302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");

const wss = new Server({ port: 8088 });
console.log('[WS] WebSocket server started on ws://localhost:8088');

wss.on('connection', (ws: import('ws').WebSocket) => {
  let topicId: string = "";
  let subscription: any = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.topicId) {
        topicId = String(data.topicId);
        const client = Client.forTestnet();
        client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
        subscription = new TopicMessageQuery()
          .setTopicId(topicId)
          .setStartTime(0)
          .subscribe(
            client,
            (message: any, error: Error | null) => {
              if (error) {
                ws.send(JSON.stringify({ error: error.message }));
                return;
              }
              if (message) {
                const content = Buffer.from(message.contents).toString("utf-8");
                ws.send(JSON.stringify({ sequenceNumber: message.sequenceNumber, content }));
              }
            }
          );
        ws.send(JSON.stringify({ status: `Subscribed to topic ${topicId}` }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: (err as Error).message }));
    }
  });

  ws.on('close', () => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });
});
