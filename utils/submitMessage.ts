// utils/submitMessage.ts
import { Client, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "./constants";

export interface SubmitMessageParams {
  topicId: string;
  message: string;
}

export interface SubmitMessageResult {
  status?: string;
  topicId: string;
  message: string;
  transactionId?: string;
  error?: string;
}

/**
 * Submits a message to a Hedera topic.
 * @param params - { topicId, message }
 * @returns Submission result or error.
 */
export async function submitMessageToTopic({ topicId, message }: SubmitMessageParams): Promise<SubmitMessageResult> {
  if (!topicId || !message) {
    return { topicId, message, error: "Missing topicId or message." };
  }
  let client;
  try {
    client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
    const txTopicMessageSubmit = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message);
    const submitResponse = await txTopicMessageSubmit.execute(client);
    const receipt = await submitResponse.getReceipt(client);
    return {
      status: receipt.status ? receipt.status.toString() : undefined,
      topicId,
      message,
      transactionId: submitResponse.transactionId ? submitResponse.transactionId.toString() : undefined,
    };
  } catch (error: any) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('submitMessageToTopic error:', error);
      if (error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    if (error instanceof Error) {
      return { topicId, message, error: error.message + (error.stack ? ('\n' + error.stack) : '') };
    }
    return { topicId, message, error: String(error) };
  } finally {
    if (client) client.close();
  }
}
