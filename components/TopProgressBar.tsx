'use client';

import { useEffect, useState } from 'react';

interface TopProgressBarProps {
  isLoading: boolean;
}

function TopProgressBar({ isLoading }: TopProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      // Complete the progress bar when loading stops
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }

    // Start progress animation when loading begins
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          return 90; // Cap at 90% until loading completes
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default TopProgressBar;

