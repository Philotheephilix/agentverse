
"use client"

import type React from "react"

import { useState } from "react"

type PixelInputProps = {
  name?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function PixelInput({
  name,
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
}: PixelInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className={`pixel-input-container ${className}`}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`pixel-input ${isFocused ? "pixel-input-focused" : ""}`}
      />
    </div>
  )
}
