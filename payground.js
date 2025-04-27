const {
    AccountId,
    PrivateKey,
    Client,
    TokenCreateTransaction,
    TokenType
  } = require("@hashgraph/sdk"); // v2.46.0

async function main() {
  let client;
  try {
    // Your account ID and private key from string value
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
    const MY_PRIVATE_KEY = PrivateKey.fromStringED25519("302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");

    // Pre-configured client for test network (testnet)
    client = Client.forTestnet();

    //Set the operator with the account ID and private key
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    // Start your code here
  
    
    //Create the transaction and freeze for manual signing
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName("Your Token Name")
      .setTokenSymbol("F")
      .setTokenType(TokenType.FUNGIBLE_COMMON)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setInitialSupply(5000)
      .freezeWith(client);

    //Sign the transaction with the token treasury account private key
    const signTxTokenCreate =  await txTokenCreate.sign(MY_PRIVATE_KEY);

    //Sign the transaction with the client operator private key and submit to a Hedera network
    const txTokenCreateResponse = await signTxTokenCreate.execute(client);

    //Get the receipt of the transaction
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client);

    //Get the token ID from the receipt
    const tokenId = receiptTokenCreateTx.tokenId;

    //Get the transaction consensus status
    const statusTokenCreateTx = receiptTokenCreateTx.status;

    //Get the Transaction ID
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString();

    console.log("--------------------------------- Token Creation ---------------------------------");
    console.log("Receipt status           :", statusTokenCreateTx.toString());
    console.log("Transaction ID           :", txTokenCreateId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId);
    console.log("Token ID                 :", tokenId.toString());
    
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();
