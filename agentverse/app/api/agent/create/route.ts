import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  TopicCreateTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { HCS10Client ,StandardNetworkType} from "@hashgraphonline/standards-agent-kit";



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

 

   const operatorId: string = process.env.HEDERA_OPERATOR_ID!;
       const operatorPrivateKey: string = process.env.HEDERA_PRIVATE_KEY!;
       const network: StandardNetworkType =
         (process.env.HEDERA_NETWORK as StandardNetworkType) || 'testnet';
   
       // Basic Initialization
       const hcs10Client = new HCS10Client(operatorId, operatorPrivateKey, network);
       console.log(
         `Client Initialized: Operator ${hcs10Client.getOperatorId()}, Network ${hcs10Client.getNetwork()}`
       );

       try {
        const registrationResult = await hcs10Client.createAndRegisterAgent({
          name: name as string,
          description: description as string,
          capabilities: [0],  
        });
        console.log('Registration Successful:', registrationResult.metadata);

  
      } catch (error) {
        console.error('Registration Failed:', error);
      } 
    const agentMetadata: Record<string, unknown> = {
      type: "agent",
      name: name as string,
      description: description as string,
      accountId: operatorId,
      topicId: operatorId,
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
