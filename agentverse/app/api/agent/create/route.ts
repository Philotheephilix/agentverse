import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  TopicCreateTransaction,
  Hbar,
} from "@hashgraph/sdk";

import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "@/lib/constant";

export async function POST(req: NextRequest) {
  try {
    const data: Record<string, unknown> = await req.json();
    const { name, description, profilePictureUrl, tools } = data;

    if (!('name' in data) || !('description' in data)) {
      return NextResponse.json(
        { error: "Missing required parameter(s): name, description" },
        { status: 400 }
      );
    }

    const client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    const createTopicTx = await new TopicCreateTransaction()
      .setSubmitKey(MY_PRIVATE_KEY)
      .setMaxTransactionFee(new Hbar(2))
      .execute(client);

    const receipt = await createTopicTx.getReceipt(client);
    console.log(receipt);
    const agentTopicId = receipt.topicId!.toString();
    console.log(agentTopicId);  
    const agentMetadata: Record<string, unknown> = {
      type: "agent",
      name,
      description,
      accountId: MY_ACCOUNT_ID.toString(),
      topicId: agentTopicId,
    };
    console.log(agentMetadata);

    if (profilePictureUrl) agentMetadata.profilePictureUrl = profilePictureUrl;
    if (tools && Array.isArray(tools)) agentMetadata.tools = tools;

    return NextResponse.json({ agentMetadata }, { status: 200 });
  } catch (err) {
   
    return NextResponse.json(
      { error: err},
      { status: 500 }
    );
  }
}
