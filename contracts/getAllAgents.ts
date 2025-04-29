import { Interface } from "ethers";

import { 
    Client, 
    ContractCallQuery, 
    Hbar,
    ContractId,
    AccountId,
    PrivateKey  } from "@hashgraph/sdk";
  
  interface Agent {
    agentName: string;
    description: string;
    topicId: string;
    agentAddress: string;
  }
  
  const setupClient = (): Client => {
    const client = Client.forTestnet();
    const myAccountId = AccountId.fromString("0.0.5864744");
    const myPrivateKey = PrivateKey.fromString("302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");
    client.setOperator(myAccountId, myPrivateKey);
    
    return client;
  };
  const client = setupClient();
  const contractId = ContractId.fromString("0.0.5924695");
  
const iface = new Interface([
  "function getAllAgents() view returns (tuple(string agentName, string description, string topicId, address agentAddress)[])"
]);

async function getAllAgents(): Promise<Agent[]> {
  const query = new ContractCallQuery()
    .setGas(300000)
    .setContractId(contractId)
    .setFunction("getAllAgents")
    .setQueryPayment(new Hbar(2));

  const result = await query.execute(client);
  const rawBytes = result.asBytes();

  try {
    const decoded = iface.decodeFunctionResult("getAllAgents", rawBytes);
    const agentTuples = decoded[0];

    const agents: Agent[] = agentTuples.map((agent: any) => ({
      agentName: agent.agentName,
      description: agent.description,
      topicId: agent.topicId,
      agentAddress: agent.agentAddress
    }));

    console.log("Decoded agents:", agents);
    return agents;
  } catch (err) {
    console.error("Failed to decode agents:", err);
    return [];
  }
}
  async function runExamples(): Promise<void> {

    getAllAgents()
  }
  
  export {
    getAllAgents,
    runExamples
  };
  
  if (require.main === module) {
    runExamples().catch(console.error);
  }