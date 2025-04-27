const { Client, TokenCreateTransaction, TokenType } = require("@hashgraph/sdk");
const { MY_ACCOUNT_ID, MY_PRIVATE_KEY } = require("../../utils/constants");
/**
 * Creates a new token on Hedera.
 * @param {object} params - { tokenName, tokenSymbol, initialSupply }
 * @returns {Promise<object>} Token creation result or error.
 */
module.exports = {
  name: 'create_token',
  description: 'Creates a new Hedera token. Params tokenName, tokenSymbol, initialSupply',
  func: async (input) => {
  let params = input;
  if (typeof input === 'string') {
    try {
      params = JSON.parse(input);
    } catch (e) {
      return { error: 'Invalid input format. Expecting JSON object.' };
    }
  }
  // Use built-in accountId and privateKey (do not take from user input)
  const { tokenName, tokenSymbol, initialSupply } = params;
  let client;
  try {
    client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FUNGIBLE_COMMON)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setInitialSupply(Number(initialSupply))
      .freezeWith(client);
    const signTxTokenCreate = await txTokenCreate.sign(MY_PRIVATE_KEY);
    const txTokenCreateResponse = await signTxTokenCreate.execute(client);
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client);
    const tokenId = receiptTokenCreateTx.tokenId;
    const statusTokenCreateTx = receiptTokenCreateTx.status;
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString();
    return {
      status: statusTokenCreateTx.toString(),
      transactionId: txTokenCreateId,
      tokenId: tokenId.toString(),
      hashscanUrl: `https://hashscan.io/testnet/tx/${txTokenCreateId}`
    };
  } catch (error) {
    return { error: error.message };
  } finally {
    if (client) client.close();
  }
  },
  schema: {
    type: 'object',
    properties: {
      tokenName: { type: 'string', description: 'Token name' },
      tokenSymbol: { type: 'string', description: 'Token symbol' },
      initialSupply: { type: 'integer', description: 'Initial supply of the token' }
    },
    required: ['tokenName', 'tokenSymbol', 'initialSupply']
  }
};