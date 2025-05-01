import {
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../utils/constants";

/**
 * LangChain-compatible tool for creating and minting a simple NFT
 * Accepts: { tokenName, tokenSymbol, maxSupply, metadata }
 */
module.exports = {
  name: "mint_nft",
  description: "Creates an NFT collection and mints a single NFT with provided metadata. Params: tokenName, tokenSymbol, maxSupply, metadata.",
  func: async (input: any) => {
    try {
      let params = input;
      if (typeof input === "string") {
        params = JSON.parse(input);
      }
      const { tokenName, tokenSymbol, maxSupply, metadata } = params;
      if (!tokenName || !tokenSymbol || !maxSupply || !metadata) {
        return JSON.stringify(JSON.stringify({ error: "Missing required parameter. Required: tokenName, tokenSymbol, maxSupply, metadata" }));
      }

      const client = Client.forTestnet();
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

      // Create NFT
      const tx = await new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol(tokenSymbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(Number(maxSupply))
        .setTreasuryAccountId(MY_ACCOUNT_ID)
        .setAdminKey(MY_PRIVATE_KEY)
        .setSupplyKey(MY_PRIVATE_KEY)
        .setMaxTransactionFee(new Hbar(20))
        .freezeWith(client);
      const signedTx = await tx.sign(MY_PRIVATE_KEY);
      const txResponse = await signedTx.execute(client);
      const receipt = await txResponse.getReceipt(client);
      const tokenId = receipt.tokenId?.toString();
      if (!tokenId) return JSON.stringify(JSON.stringify({ error: "Failed to create NFT" }));

      // Mint NFT
      const mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from(metadata)])
        .freezeWith(client);
      const mintSigned = await mintTx.sign(MY_PRIVATE_KEY);
      const mintResponse = await mintSigned.execute(client);
      await mintResponse.getReceipt(client);

      return JSON.stringify(JSON.stringify({
        tokenId,
      }));
    } catch (err: any) {
      return JSON.stringify(JSON.stringify({ error: err.message || String(err) }));
    }
  },
  schema: {
    type: "object",
    properties: {
      tokenName: { type: "string", description: "NFT collection name" },
      tokenSymbol: { type: "string", description: "NFT collection symbol" },
      maxSupply: { type: "number", description: "Maximum NFT supply" },
      metadata: { type: "string", description: "Metadata for the NFT (string, e.g. URL or JSON)" },
    },
    required: ["tokenName", "tokenSymbol", "maxSupply", "metadata"],
  },
};