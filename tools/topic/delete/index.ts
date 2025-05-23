import { Client, TopicDeleteTransaction } from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../../utils/constants";

/**
 * Deletes a topic on Hedera.
 * @param {object} params - { topicId }
 * @returns {Promise<object>} Topic deletion result or error.
 */
module.exports = {
  name: 'delete_topic',
  description: 'Deletes a Hedera topic on testnet. Requires topicId.',
  func: async (input: any) => {
    let topicId;
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        topicId = parsed.topicId || input;
      } catch (e) {
        topicId = input;
      }
    } else if (typeof input === 'object' && input.topicId) {
      topicId = input.topicId;
    }
    if (!topicId) {
      return JSON.stringify({ output: JSON.stringify({ error: 'Missing topicId.' }) });
    }
    let client;
    try {
      client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
      const txTopicDelete = await new TopicDeleteTransaction()
        .setTopicId(topicId)
        .freezeWith(client);
      const signTxTopicDelete = await txTopicDelete.sign(MY_PRIVATE_KEY);
      const txTopicDeleteResponse = await signTxTopicDelete.execute(client);
      const receiptTopicDeleteTx = await txTopicDeleteResponse.getReceipt(client);
      const statusTopicDeleteTx = receiptTopicDeleteTx.status;
      const txTopicDeleteId = txTopicDeleteResponse.transactionId.toString();
      return JSON.stringify({
        output: JSON.stringify({
          status: statusTopicDeleteTx.toString(),
          transactionId: txTopicDeleteId,
          hashscanUrl: `https://hashscan.io/testnet/tx/${txTopicDeleteId}`
        })
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return JSON.stringify({ output: JSON.stringify({ error: error.message }) });
      }
      return JSON.stringify({ output: JSON.stringify({ error: String(error) }) });
    } finally {
      if (client) client.close();
    }
  },
  schema: {
    type: 'object',
    properties: {
      topicId: { type: 'string', description: 'Topic ID to delete' }
    },
    required: ['topicId']
  }
};
