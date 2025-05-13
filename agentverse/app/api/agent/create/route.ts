import { NextRequest, NextResponse } from "next/server";
import { HCS10Client, StandardNetworkType } from "@hashgraphonline/standards-agent-kit";

interface RegistrationResult {
  metadata: {
    accountId: string;
    inboundTopicId: string;
  };
}

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

    // Start the agent creation process
    const registrationPromise = hcs10Client.createAndRegisterAgent({
      name: name as string,
      description: description as string,
      capabilities: [0],
    });

    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 180000); // 3 minute timeout
    });

    // Race between the registration and timeout
    const registrationResult = await Promise.race([registrationPromise, timeoutPromise]) as RegistrationResult;

    if (!registrationResult?.metadata) {
      throw new Error('Registration failed: metadata is undefined');
    }

    const agentMetadata: Record<string, unknown> = {
      type: "agent",
      name: name as string,
      description: description as string,
      accountId: registrationResult.metadata.accountId,
      topicId: registrationResult.metadata.inboundTopicId,
    };

    if (profilePictureUrl) agentMetadata.profilePictureUrl = profilePictureUrl;
    if (tools && Array.isArray(tools)) agentMetadata.tools = tools;

    return NextResponse.json({ agentMetadata }, { status: 200 });
  } catch (err) {
    console.error('Error in agent creation:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
