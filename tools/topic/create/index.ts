// Create Topic Tool for LangChain
import { Client, TopicCreateTransaction } from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../../utils/constants";

/**
 * Creates a new topic on Hedera.
 * No input params required.
 * @param {object} input - Input parameters (not used)
 * @returns {Promise<object>} Topic creation result or error.
 */
module.exports = {
  name: 'create_topic',
  description: 'Creates a new Hedera topic on testnet. No input params required.',
  func: async (input: object) => {
    // Use built-in accountId and privateKey (do not take from user input)
    let client;
    try {
      client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
      const txCreateTopic = new TopicCreateTransaction();
      const txCreateTopicResponse = await txCreateTopic.execute(client);
      const receiptCreateTopicTx = await txCreateTopicResponse.getReceipt(client);
      const statusCreateTopicTx = receiptCreateTopicTx.status;
      const txCreateTopicId = txCreateTopicResponse.transactionId.toString();
      return {
        output: JSON.stringify({
          status: statusCreateTopicTx.toString(),
          transactionId: txCreateTopicId,
          topicId: receiptCreateTopicTx.topicId ? receiptCreateTopicTx.topicId.toString() : undefined,
          hashscanUrl: `https://hashscan.io/testnet/tx/${txCreateTopicId}`
        })
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { output: JSON.stringify({ error: error.message }) };
      }
      return { output: JSON.stringify({ error: String(error) }) };
    } finally {
      if (client) client.close();
    }
  },
  schema: {
    type: 'object',
    properties: {},
    required: []
  }
};
