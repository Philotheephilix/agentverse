import { Client, TokenCreateTransaction, TokenType } from "@hashgraph/sdk";
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../utils/constants";

export interface CreateTokenInput {
  tokenName: string;
  tokenSymbol: string;
  initialSupply: number;
}

export interface CreateTokenOutput {
  tokenId?: string;
  error?: string;
}

export const name = 'create_token';
export const description = 'Creates a new Hedera token. Params tokenName, tokenSymbol, initialSupply';

export const func = async (input: string | CreateTokenInput): Promise<CreateTokenOutput> => {
  let params: CreateTokenInput;
  if (typeof input === 'string') {
    try {
      params = JSON.parse(input);
    } catch (e) {
      return { error: 'Invalid input format. Expecting JSON object.' };
    }
  } else {
    params = input;
  }
  const { tokenName, tokenSymbol, initialSupply } = params;
  let client: Client | null = null;
  try {
    client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setInitialSupply(Number(initialSupply))
      .freezeWith(client);
    const signTxTokenCreate = await txTokenCreate.sign(MY_PRIVATE_KEY);
    const txTokenCreateResponse = await signTxTokenCreate.execute(client);
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client);
    const tokenId = receiptTokenCreateTx.tokenId;
    if (tokenId) {
      return { tokenId: tokenId.toString() };
    } else {
      return { error: 'Token creation failed: No tokenId returned.' };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: String(error) };
  } finally {
    if (client) client.close();
  }
}