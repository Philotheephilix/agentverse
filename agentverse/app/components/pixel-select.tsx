"use client"

import type React from "react"

import { useState } from "react"

type Option = {
  value: string
  label: string
}

type PixelSelectProps = {
  name?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: Option[]
  required?: boolean
}

export default function PixelSelect({ name, value, onChange, options, required = false }: PixelSelectProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className="pixel-select-container">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`pixel-select ${isFocused ? "pixel-select-focused" : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pixel-select-arrow">▼</div>
    </div>
  )
}
