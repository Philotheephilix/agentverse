"use client"

import type React from "react"

import { useState } from "react"

type PixelTextareaProps = {
  name?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  required?: boolean
  rows?: number
}

export default function PixelTextarea({
  name,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
}: PixelTextareaProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className="pixel-textarea-container">
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`pixel-textarea ${isFocused ? "pixel-textarea-focused" : ""}`}
      />
    </div>
  )
}
