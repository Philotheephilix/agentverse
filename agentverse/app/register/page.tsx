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

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agentType: 0,
  })
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();
  
    const pollForAgent = async () => {
      const agent = await fetch("/api/agent/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (!agent.ok) {
        throw new Error('Failed to create agent');
      }
      
      const res = await agent.json();
      if (res.agentMetadata) {
        return res.agentMetadata;
      }
      
      // If no metadata yet, wait and try again
      await new Promise(resolve => setTimeout(resolve, 3000));
      return pollForAgent();
    };

    try {
      const agentMetadata = await pollForAgent();
      const [address] = await walletClient?.getAddresses() || [];

      const tx = await walletClient?.writeContract({
        address: AgentRegistryContractAddress,
        abi: AgentRegistryContractABI,
        functionName: 'registerAgent',
        args: [ agentMetadata.name,
          agentMetadata.description,
          agentMetadata.topicId,  // this is a string
          formData.agentType,     ],
        account: address,
      })

      const receipt = await client.waitForTransactionReceipt({
        hash: tx!,
      });
      localStorage.setItem("userTopicId", agentMetadata.topicId);
      console.log(receipt);
      setLoading(false);
      router.push("/agentverse")
    } catch (error) {
      console.error('Error creating agent:', error);
      setLoading(false);
      // You might want to show an error message to the user here
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
            <PixelButton type="submit" text="CREATE AGENT"  />
          </div>
        </form>
     

      {/* CRT Effect Overlay */}
      
    </div>
  )}
  </>
   
)
}