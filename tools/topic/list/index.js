const {
  Client,
  TopicMessageQuery
} = require("@hashgraph/sdk");
const { MY_ACCOUNT_ID, MY_PRIVATE_KEY } = require("../../../utils/constants");

/**
 * Lists all messages for a Hedera topic.
 * @param {object} params - { topicId }
 * @returns {Promise<object>} All messages for the topic or error.
 */
module.exports = {
  name: 'list_topic_messages',
  description: 'Lists all messages for a Hedera topic. Param: topicId',
  func: async (input) => {
    let params = input;
    if (typeof input === 'string') {
      try {
        params = JSON.parse(input);
      } catch (e) {
        return { output: JSON.stringify({ error: 'Invalid input format. Expecting JSON object.' }) };
      }
    }
    const { topicId } = params;
    if (!topicId) {
      return { output: JSON.stringify({ error: 'Missing topicId.' }) };
    }
    let client;
    const messages = [];
    try {
      client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
      await new Promise((resolve, reject) => {
        new TopicMessageQuery()
          .setTopicId(topicId)
          .setStartTime(0)
          .subscribe(
            client,
            (message) => {
              messages.push(Buffer.from(message.contents, "utf8").toString());
            },
            (error) => reject(error),
            () => resolve()
          );
      });
      return { output: JSON.stringify({ topicId, messages }) };
    } catch (error) {
      return { output: JSON.stringify({ error: error.message }) };
    } finally {
      if (client) client.close();
    }
  },
  schema: {
    type: 'object',
    properties: {
      topicId: { type: 'string', description: 'Topic ID to list messages for' }
    },
    required: ['topicId']
  }
};
