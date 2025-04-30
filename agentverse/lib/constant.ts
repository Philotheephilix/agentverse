export const AgentRegistryContractAddress = "0x57223AABb448F552Bd69cd48e4bCA980aDa9EAaB"
export const AgentRegistryContractABI = 
[
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "agentAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "agentName",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "topicId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "enum AgentRegistry.AgentType",
				"name": "agentType",
				"type": "uint8"
			}
		],
		"name": "AgentRegistered",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "agentList",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "agents",
		"outputs": [
			{
				"internalType": "string",
				"name": "agentName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "topicId",
				"type": "string"
			},
			{
				"internalType": "enum AgentRegistry.AgentType",
				"name": "agentType",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "agentAddress",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_agentAddress",
				"type": "address"
			}
		],
		"name": "getAgent",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "agentName",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "description",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "topicId",
						"type": "string"
					},
					{
						"internalType": "enum AgentRegistry.AgentType",
						"name": "agentType",
						"type": "uint8"
					},
					{
						"internalType": "address",
						"name": "agentAddress",
						"type": "address"
					}
				],
				"internalType": "struct AgentRegistry.Agent",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_agentAddress",
				"type": "address"
			}
		],
		"name": "getAgentName",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAllAgents",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "agentName",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "description",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "topicId",
						"type": "string"
					},
					{
						"internalType": "enum AgentRegistry.AgentType",
						"name": "agentType",
						"type": "uint8"
					},
					{
						"internalType": "address",
						"name": "agentAddress",
						"type": "address"
					}
				],
				"internalType": "struct AgentRegistry.Agent[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_agentName",
				"type": "string"
			}
		],
		"name": "isAgentNameAvailable",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_agentName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_description",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_topicId",
				"type": "string"
			},
			{
				"internalType": "uint8",
				"name": "_agentType",
				"type": "uint8"
			}
		],
		"name": "registerAgent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]
import { AccountId, PrivateKey } from "@hashgraph/sdk";

export const MY_ACCOUNT_ID = AccountId.fromString("0.0.5864744");
export const MY_PRIVATE_KEY = PrivateKey.fromStringED25519("302e020100300506032b657004220420d04f46918ebce20abe26f7d34e5018ac2ba8aa7ffacf9f817656789b36f76207");