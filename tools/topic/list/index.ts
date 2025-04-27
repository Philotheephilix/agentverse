import { Client, TopicMessageQuery } from '@hashgraph/sdk';
import { z } from 'zod';
// Import from environment variables or create constants here
const MY_ACCOUNT_ID = process.env.MY_ACCOUNT_ID || "";
const MY_PRIVATE_KEY = process.env.MY_PRIVATE_KEY || ""; 

interface ListTopicMessagesInput {
  topicId: string;
}

interface ListTopicMessagesOutput {
  output: string; // JSON string
}

const schema = z.object({
  topicId: z.string().describe('Topic ID to list messages for'),
});

export const listTopicMessages = {
  name: 'list_topic_messages',
  description: 'Lists all messages for a Hedera topic. Param: topicId',
  schema,

  func: async (input: string | ListTopicMessagesInput): Promise<ListTopicMessagesOutput> => {
    let params: ListTopicMessagesInput;
    
    if (typeof input === 'string') {
      try {
        params = JSON.parse(input);
      } catch (e) {
        return { output: JSON.stringify({ error: 'Invalid input format. Expecting JSON object.' }) };
      }
    } else {
      params = input;
    }

    const { topicId } = params;
    if (!topicId) {
      return { output: JSON.stringify({ error: 'Missing topicId.' }) };
    }

    let client: Client | null = null;
    const messages: string[] = [];

    try {
      client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

      await new Promise<void>((resolve, reject) => {
        const query = new TopicMessageQuery()
          .setTopicId(topicId)
          .setStartTime(0)
          .subscribe(
            client!,
            (message) => {
              if (message && message.contents) {
                messages.push(Buffer.from(message.contents).toString('utf8'));
              }
            },
            (error) => {
              reject(error);
              // Resolve is called when we unsubscribe manually
              resolve();
            }
          );
          
        // Allow some time to fetch messages, then unsubscribe and resolve
        setTimeout(() => {
          query.unsubscribe();
          resolve();
        }, 5000); // Adjust timeout as needed
      });

      return { output: JSON.stringify({ topicId, messages }) };

    } catch (error: any) {
      return { output: JSON.stringify({ error: error.message }) };
    } finally {
      if (client) {
        client.close();
      }
    }
  }
};
