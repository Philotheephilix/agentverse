import { NextRequest, NextResponse } from "next/server";
import { HCS10Client, StandardNetworkType } from "@hashgraphonline/standards-agent-kit";
import { jobManager } from "@/lib/jobManager";

interface AgentMetadata {
  type: string;
  name: string;
  description: string;
  accountId: string;
  topicId: string;
  profilePictureUrl?: string;
  tools?: unknown[];
}

async function createAgent(data: Record<string, unknown>, jobId: string) {
  try {
    console.log('Starting agent creation for job:', jobId);
    const { name, description, profilePictureUrl, tools } = data;

    const operatorId: string = process.env.HEDERA_OPERATOR_ID!;
    const operatorPrivateKey: string = process.env.HEDERA_PRIVATE_KEY!;
    const network: StandardNetworkType =
      (process.env.HEDERA_NETWORK as StandardNetworkType) || 'testnet';

    const hcs10Client = new HCS10Client(operatorId, operatorPrivateKey, network);
    console.log(
      `Client Initialized: Operator ${hcs10Client.getOperatorId()}, Network ${hcs10Client.getNetwork()}`
    );

    const registrationResult = await hcs10Client.createAndRegisterAgent({
      name: name as string,
      description: description as string,
      capabilities: [0],
    });

    if (!registrationResult?.metadata) {
      throw new Error('Registration failed: metadata is undefined');
    }

    const agentMetadata: AgentMetadata = {
      type: "agent",
      name: name as string,
      description: description as string,
      accountId: registrationResult.metadata.accountId,
      topicId: registrationResult.metadata.inboundTopicId,
    };

    if (profilePictureUrl) agentMetadata.profilePictureUrl = profilePictureUrl as string;
    if (tools && Array.isArray(tools)) agentMetadata.tools = tools;

    console.log('Agent creation completed for job:', jobId);
    jobManager.completeJob(jobId, { agentMetadata });
  } catch (err) {
    console.error('Error in agent creation for job:', jobId, err);
    jobManager.failJob(jobId, err instanceof Error ? err.message : 'Unknown error occurred');
  }
}

export async function POST(req: NextRequest) {
  try {
    const data: Record<string, unknown> = await req.json();

    if (!('name' in data) || !('description' in data)) {
      return NextResponse.json(
        { error: "Missing required parameter(s): name, description" },
        { status: 400 }
      );
    }

    const jobId = jobManager.createJob();
    console.log('Created new job:', jobId);
    
    // Start the agent creation process asynchronously
    // Use setImmediate to ensure the response is sent before starting the long process
    setImmediate(() => {
      createAgent(data, jobId).catch(err => {
        console.error('Unhandled error in createAgent:', err);
      });
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    console.error('Error initiating agent creation:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
