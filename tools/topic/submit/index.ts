import { Client, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../../utils/constants";

/**
 * Submits a message to a Hedera topic.
 * @param {object} params - { topicId, message }
 * @returns {Promise<object>} Submission result or error.
 */
module.exports = {
  name: 'send_topic_message',
  description: 'sends a message to a Hedera topic. Params: topicId, message',
  func: async (input: any) => {
    let params = input;
    if (typeof input === 'string') {
      try {
        params = JSON.parse(input);
      } catch (e) {
        return { output: 'Invalid input format. Expecting JSON object.' };
      }
    }
    const { topicId, message } = params;
    if (!topicId || !message) {
      return { output: 'Missing topicId or message.' };
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
      return { output: { status: receipt.status ? receipt.status.toString() : undefined, topicId, message, transactionId: submitResponse.transactionId ? submitResponse.transactionId.toString() : undefined } };
    } catch (error: any) {
      // Log error details
      if (typeof console !== 'undefined' && console.error) {
        console.error('submit_topic_message error:', error);
        if (error && error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
      if (error instanceof Error) {
        return { output: error.message + (error.stack ? ('\n' + error.stack) : '') };
      }
      return { output: String(error) };
    } finally {
      if (client) client.close();
    }
  },
  schema: {
    type: 'object',
    properties: {
      topicId: { type: 'string', description: 'Topic ID to submit message to' },
      message: { type: 'string', description: 'Message to submit' }
    },
    required: ['topicId', 'message']
  }
};
