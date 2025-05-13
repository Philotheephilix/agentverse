import { Router, Request, Response } from 'express';
import { HCS10Client, StandardNetworkType } from '@hashgraphonline/standards-agent-kit';

const router = Router();

// Global variable to store jobs
declare global {
  var jobs: Record<string, {
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }>;
}

if (!global.jobs) {
  global.jobs = {};
}

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
    global.jobs[jobId] = {
      status: 'completed',
      result: { agentMetadata }
    };
  } catch (err) {
    console.error('Error in agent creation for job:', jobId, err);
    global.jobs[jobId] = {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Create agent endpoint
router.post('/create', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.name || !data.description) {
      return res.status(400).json({
        error: "Missing required parameter(s): name, description"
      });
    }

    const jobId = Date.now().toString();
    global.jobs[jobId] = { status: 'pending' };
    
    // Start the agent creation process asynchronously
    setImmediate(() => {
      createAgent(data, jobId).catch(err => {
        console.error('Unhandled error in createAgent:', err);
      });
    });

    return res.status(202).json({ jobId });
  } catch (err) {
    console.error('Error initiating agent creation:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    });
  }
});

// Check agent status endpoint
router.get('/status', (req: Request, res: Response) => {
  try {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        error: "Missing jobId parameter"
      });
    }

    const job = global.jobs?.[jobId as string];
    
    if (!job) {
      return res.status(404).json({
        error: "Job not found"
      });
    }

    return res.json(job);
  } catch (err) {
    console.error('Error checking job status:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    });
  }
});

export const agentRoutes = router; 