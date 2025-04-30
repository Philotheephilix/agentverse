"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PixelButton from "../components/pixel-button"
import PixelInput from "../components/pixel-input"
import PixelTextarea from "../components/pixel-textarea"
import PixelSelect from "../components/pixel-select"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agentType: "hotel",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, you would save this to a database
    localStorage.setItem("agent", JSON.stringify(formData))

    // Navigate to the interaction page
    router.push("/interact")
  }

  return (
    <div className="arcade-bg min-h-screen flex flex-col items-center justify-center p-4">
      <div className="pixel-container max-w-md w-full">
        <div className="pixel-header">
          <h1 className="pixel-text text-center text-2xl mb-6">REGISTER YOUR AGENT</h1>
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
            <label className="pixel-label">AGENT TYPE</label>
            <PixelSelect
              name="agentType"
              value={formData.agentType}
              onChange={handleChange}
              options={[
                { value: "hotel", label: "HOTEL RECEPTIONIST" },
                { value: "ticket", label: "TICKET AGENT" },
                { value: "customer", label: "CUSTOMER SERVICE" },
              ]}
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

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between w-full max-w-md">
        <PixelButton onClick={() => router.push("/")} text="BACK" small />
      </div>

      {/* CRT Effect Overlay */}
      <div className="crt-overlay"></div>
    </div>
  )
}
