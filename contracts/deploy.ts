const { 
    Client, 
    PrivateKey, 
    AccountId,
    FileCreateTransaction,
    Hbar,
    TransactionId,
    Transaction,
    FileContentsQuery,
    FileInfoQuery
  } = require("@hashgraph/sdk");
  const axios = require('axios'); // You may need to install this: npm install axios
  
  // Account credentials
  const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519("302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");
  
  // Initialize the client
  function createClient() {
    const client = Client.forTestnet();
    
    // Try a single node - this sometimes helps with connection issues
    client.setMirrorNetwork("hcs.testnet.mirrornode.hedera.com:5600");
    
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
    client.setMaxTransactionFee(new Hbar(10));
    client.setMaxQueryPayment(new Hbar(5));
    
    return client;
  }
  
  // Check account balance using the REST API
  async function checkBalanceWithREST() {
    try {
      console.log("Checking account balance via Mirror Node REST API...");
      const response = await axios.get(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${MY_ACCOUNT_ID.toString()}`
      );
      
      const balanceInTinybar = response.data.balance.balance;
      const balanceInHbar = balanceInTinybar / 100000000;
      console.log(`Balance: ${balanceInHbar} HBAR`);
      
      return true;
    } catch (error) {
      console.error("Error checking balance via REST API:", error);
      return false;
    }
  }
  
  // Try a different file creation approach with smaller chunks
  async function createFileWithSmallerSize() {
    const client = createClient();
    
    try {
      // Load the bytecode
      console.log("Loading bytecode...");
      const bytecodeJson = require("./bytecode.json");
      let bytecodeHex = bytecodeJson.object;
      
      if (!bytecodeHex) {
        throw new Error("Bytecode not found in JSON file");
      }
      
      // Remove 0x prefix if present
      bytecodeHex = bytecodeHex.startsWith("0x") ? bytecodeHex.slice(2) : bytecodeHex;
      
      // Convert hex string to byte array for more control
      const bytecodeBuffer = Buffer.from(bytecodeHex, 'hex');
      console.log(`Bytecode size: ${bytecodeBuffer.length} bytes`);
      
      // If bytecode is large, try with a small test file first
      // This helps determine if the issue is with file size or something else
      console.log("Creating a test file with small content first...");
      const testContent = Buffer.from("Hello Hedera Test", "utf8");
      
      const testFileCreateTx = new FileCreateTransaction()
        .setContents(testContent)
        .setMaxTransactionFee(new Hbar(2))
        .freezeWith(client);
        
      const testFileResponse = await testFileCreateTx.execute(client);
      const testFileReceipt = await testFileResponse.getReceipt(client);
      const testFileId = testFileReceipt.fileId;
      
      console.log(`✅ Test file created successfully with ID: ${testFileId}`);
      
      // If successful with test file, now try with actual bytecode
      // Let's check the test file to confirm it worked
      const fileInfo = await new FileInfoQuery()
        .setFileId(testFileId)
        .execute(client);
        
      console.log(`Test file info: Size = ${fileInfo.size} bytes`);
      
      console.log("Now attempting to create file with actual bytecode...");
      // Try with the real bytecode now that we know simple files work
      const fileCreateTx = new FileCreateTransaction()
        .setContents(bytecodeBuffer)
        .setMaxTransactionFee(new Hbar(10))
        .freezeWith(client);
        
      console.log("Executing file create transaction...");
      const fileResponse = await fileCreateTx.execute(client);
      
      console.log("Getting receipt...");
      const fileReceipt = await fileResponse.getReceipt(client);
      const fileId = fileReceipt.fileId;
      
      console.log(`✅ Contract bytecode file created with ID: ${fileId}`);
      return fileId;
      
    } catch (error) {
      console.error("Error in file creation:", error);
      throw error;
    }
  }
  
  // Main execution
  async function main() {
    try {
      // First try REST API to check connectivity
      await checkBalanceWithREST();
      
      // Then try creating a file with smaller test content first
      const fileId = await createFileWithSmallerSize();
      
      console.log("✅ Process completed successfully!");
      console.log("File ID for contract deployment:", fileId);
      
    } catch (error) {
      console.error("❌ Process failed:", error);
    }
  }
  
  main();