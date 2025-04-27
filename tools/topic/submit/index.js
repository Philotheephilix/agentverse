const {
  Client,
  TopicMessageSubmitTransaction
} = require("@hashgraph/sdk");
const { MY_ACCOUNT_ID, MY_PRIVATE_KEY } = require("../../../utils/constants");

/**
 * Submits a message to a Hedera topic.
 * @param {object} params - { topicId, message }
 * @returns {Promise<object>} Submission result or error.
 */
module.exports = {
  name: 'submit_topic_message',
  description: 'Submits a message to a Hedera topic. Params: topicId, message',
  func: async (input) => {
    let params = input;
    if (typeof input === 'string') {
      try {
        params = JSON.parse(input);
      } catch (e) {
        return { output: JSON.stringify({ error: 'Invalid input format. Expecting JSON object.' }) };
      }
    }
    const { topicId, message } = params;
    if (!topicId || !message) {
      return { output: JSON.stringify({ error: 'Missing topicId or message.' }) };
    }
    let client;
    try {
      client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
      const txTopicMessageSubmit = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);
      const getTopicMessage = txTopicMessageSubmit.getMessage();
      return {
        output: JSON.stringify({
          topicMessage: getTopicMessage.toString(),
          topicId,
          message,
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
    properties: {
      topicId: { type: 'string', description: 'Topic ID to submit message to' },
      message: { type: 'string', description: 'Message to submit' }
    },
    required: ['topicId', 'message']
  }
};
