// Create Topic Tool for LangChain
const {
  Client,
  TopicCreateTransaction
} = require("@hashgraph/sdk");
const { MY_ACCOUNT_ID, MY_PRIVATE_KEY } = require("../../../utils/constants");
/**
 * Creates a new topic on Hedera.
 * No input params required.
 * @returns {Promise<object>} Topic creation result or error.
 */
module.exports = {
  name: 'create_topic',
  description: 'Creates a new Hedera topic on testnet. No input params required.',
  func: async () => {
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
      const topicId = receiptCreateTopicTx.topicId.toString();
      return {
        output: JSON.stringify({
          status: statusCreateTopicTx.toString(),
          transactionId: txCreateTopicId,
          topicId,
          hashscanUrl: `https://hashscan.io/testnet/tx/${txCreateTopicId}`
        })
      };
    } catch (error) {
      return { output: JSON.stringify({ error: error.message }) };
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
