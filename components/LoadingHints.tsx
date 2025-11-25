'use client';

import { useEffect, useState } from 'react';

const hints = [
  "If you're not tracking you're slacking!",
  "Progress happens one rep at a time.",
  "The only bad workout is the one that didn't happen.",
  "Your future self will thank you for today's effort.",
  "Strength doesn't come from what you can do. It comes from overcoming what you once thought you couldn't.",
  "Sweat is just your fat crying.",
  "Don't stop when you're tired. Stop when you're done.",
  "The body achieves what the mind believes.",
  "Train like a beast, look like a beauty.",
  "Excuses don't burn calories.",
  "Push yourself because no one else is going to do it for you.",
  "The pain you feel today will be the strength you feel tomorrow.",
];

export function LoadingHints() {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set random initial hint only on client side to avoid hydration mismatch
    setCurrentHintIndex(Math.floor(Math.random() * hints.length));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const interval = setInterval(() => {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setCurrentHintIndex((prev) => (prev + 1) % hints.length);
        setIsVisible(true);
      }, 300); // Fade out, then change hint and fade in
    }, 3000); // Change hint every 3 seconds

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mounted]);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="text-muted-foreground text-lg animate-pulse">
        Loading...
      </div>
      <div className="text-center max-w-md px-4">
        <p
          key={currentHintIndex}
          className={`text-sm text-muted-foreground italic transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          💪 {hints[currentHintIndex]}
        </p>
      </div>
    </div>
  );
}

