"use client"

import { useState, useEffect } from "react"

type PixelButtonProps = {
  onClick?: () => void
  text: string
  type?: "button" | "submit" | "reset"
  small?: boolean
}

export default function PixelButton({ onClick, text, type = "button", small = false }: PixelButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Create blinking animation effect
    let interval: NodeJS.Timeout
    if (isHovered) {
      interval = setInterval(() => {
        setIsAnimating((prev) => !prev)
      }, 200)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isHovered])

  return (
    <div className="pixel-button-container">
      {/* Scanlines overlay */}
      <div className="scanlines"></div>

      <button
        type={type}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsPressed(false)
          setIsAnimating(false)
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className={`
          pixel-button
          ${isPressed ? "pixel-button-pressed" : ""}
          ${isHovered && isAnimating ? "pixel-button-blink" : ""}
          ${small ? "pixel-button-small" : ""}
        `}
      >
        <span className="pixel-text">{text}</span>

        {/* Pixelated arrow */}
        <div className={`pixel-arrow ${isHovered ? "pixel-arrow-animated" : ""}`}>
          <div className="pixel"></div>
          <div className="pixel"></div>
          <div className="pixel"></div>
        </div>
      </button>
    </div>
  )
}
