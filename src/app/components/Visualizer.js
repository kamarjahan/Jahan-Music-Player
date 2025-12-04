'use client'
import { motion } from "framer-motion"

export default function Visualizer({ isPlaying }) {
  // We create 5 bars that move randomly to simulate audio frequency
  const bars = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-end justify-center gap-1 h-8">
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className="w-1 bg-[#1DB954] rounded-t-full"
          animate={isPlaying ? {
            height: [
              "10%", 
              `${Math.random() * 100}%`, 
              "50%", 
              `${Math.random() * 100}%`, 
              "10%"
            ],
          } : { height: "10%" }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: bar * 0.1 // Stagger the animation so they don't move together
          }}
        />
      ))}
    </div>
  )
}