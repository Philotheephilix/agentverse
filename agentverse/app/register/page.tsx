"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PixelInput from "../components/pixel-input"
import PixelTextarea from "../components/pixel-textarea"
import PixelButton from "../components/pixel-button"
import { client, walletClient } from "@/lib/Client"
import { AgentRegistryContractAddress, AgentRegistryContractABI } from "@/lib/constant"

import * as dotenv from 'dotenv';
dotenv.config(); 

// Get the API base URL from environment variable

interface AgentMetadata {
  type: string;
  name: string;
  description: string;
  accountId: string;
  topicId: string;
  profilePictureUrl?: string;
  tools?: unknown[];
}

interface JobResponse {
  status: 'pending' | 'completed' | 'failed';
  result?: { agentMetadata: AgentMetadata };
  error?: string;
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agentType: 0,
  })
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const pollJobStatus = async (jobId: string): Promise<AgentMetadata> => {
    const response = await fetch(`https://agentverse-fsvs.vercel.app/api/agent/status?jobId=${jobId}`);
    const data = await response.json() as JobResponse;

    if (data.status === 'completed' && data.result?.agentMetadata) {
      return data.result.agentMetadata;
    } else if (data.status === 'failed') {
      throw new Error(data.error || 'Job failed');
    }

    // If still pending, wait 5 seconds and try again
    await new Promise(resolve => setTimeout(resolve, 5000));
    return pollJobStatus(jobId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    setError(null);
    e.preventDefault();

    try {
      // Start the agent creation process
      const createResponse = await fetch(`https://agentverse-fsvs.vercel.app/api/agent/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to start agent creation');
      }

      const { jobId } = await createResponse.json();
      
      // Poll for job completion
      const agentMetadata = await pollJobStatus(jobId);
      
      // Once we have the metadata, proceed with contract interaction
      const [address] = await walletClient?.getAddresses() || [];

      const tx = await walletClient?.writeContract({
        address: AgentRegistryContractAddress,
        abi: AgentRegistryContractABI,
        functionName: 'registerAgent',
        args: [
          agentMetadata.name,
          agentMetadata.description,
          agentMetadata.topicId,
          formData.agentType,
        ],
        account: address,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: tx!,
      });
      
      localStorage.setItem("userTopicId", agentMetadata.topicId);
      console.log(receipt);
      setLoading(false);
      router.push("/agentverse");
    } catch (error) {
      console.error('Error creating agent:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setLoading(false);
    }
  }

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin w-12 h-12 bg-red-500 border-4 border-yellow-400"></div>
        </div>
      ) : (
        <div className="pixel-container max-w-md w-full">
          <div className="pixel-header">
            <h1 className="pixel-text text-center text-2xl mb-6">REGISTER USER AGENT</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label className="pixel-label">AGENT NAME</label>
              <PixelInput
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="ENTER AGENT NAME"
              />
            </div>

            <div className="form-group">
              <label className="pixel-label">DESCRIPTION</label>
              <PixelTextarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="DESCRIBE YOUR AGENT'S PERSONALITY"
                rows={4}
              />
            </div>

            <div className="flex justify-center mt-8">
              <PixelButton type="submit" text="CREATE AGENT" />
            </div>
          </form>
        </div>
      )}
    </>
  );
}