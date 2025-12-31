'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface KkottiProps {
  mood?: 'neutral' | 'happy' | 'sad' | 'working' | 'thinking'
  message?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right'
  autoClose?: boolean
}

export default function Kkotti({ 
  mood = 'neutral',
  message,
  position = 'bottom-right',
  autoClose = false
}: KkottiProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMood, setCurrentMood] = useState(mood)

  useEffect(() => {
    setCurrentMood(mood)
  }, [mood])

  useEffect(() => {
    if (message && autoClose) {
      setIsOpen(true)
      const timer = setTimeout(() => setIsOpen(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [message, autoClose])

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
  }

  const faces = {
    neutral: '/kkotti/face-neutral.svg',
    happy: '/kkotti/face-happy.svg',
    sad: '/kkotti/face-sad.svg',
    working: '/kkotti/face-working.svg',
    thinking: '/kkotti/face-thinking.svg',
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* 말풍선 */}
      <AnimatePresence>
        {(isOpen || message) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute bottom-24 right-0 bg-white rounded-2xl shadow-xl p-4 w-64 mb-2"
          >
            <div className="text-sm text-gray-700 leading-relaxed">{message}</div>
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white transform rotate-45 shadow"></div>
            
            {!autoClose && (
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 꼬띠 캐릭터 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-20 h-20 focus:outline-none"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* 배경 원 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-pink-100 to-red-100 rounded-full shadow-lg"
          animate={{
            boxShadow: [
              '0 4px 20px rgba(255, 68, 88, 0.2)',
              '0 4px 30px rgba(255, 68, 88, 0.4)',
              '0 4px 20px rgba(255, 68, 88, 0.2)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* 꼬띠 SVG 레이어 */}
        <motion.div
          className="relative w-full h-full"
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* 몸통 */}
          <img 
            src="/kkotti/body.svg" 
            alt="꼬띠 몸통"
            className="absolute inset-0 w-full h-full"
          />
          
          {/* 얼굴 (표정 변화) */}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentMood}
              src={faces[currentMood]}
              alt="꼬띠 얼굴"
              className="absolute inset-0 w-full h-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          
          {/* 부츠 */}
          <img 
            src="/kkotti/boots.svg" 
            alt="꼬띠 부츠"
            className="absolute inset-0 w-full h-full"
          />
        </motion.div>
      </motion.button>
    </div>
  )
}
