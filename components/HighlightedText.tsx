'use client';

import { useMemo } from 'react';
import { findMatches } from '@/utils/searchUtils';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightedText({ text, query, className = '' }: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!query.trim()) {
      return [{ text, isMatch: false }];
    }

    const matches = findMatches(text, query);
    
    if (matches.length === 0) {
      return [{ text, isMatch: false }];
    }

    const parts: Array<{ text: string; isMatch: boolean }> = [];
    let lastIndex = 0;

    matches.forEach(match => {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.start),
          isMatch: false
        });
      }

      // Add matched text
      parts.push({
        text: text.substring(match.start, match.end),
        isMatch: true
      });

      lastIndex = match.end;
    });

    // Add remaining text after last match
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isMatch: false
      });
    }

    return parts;
  }, [text, query]);

  return (
    <span className={className}>
      {parts.map((part, index) => 
        part.isMatch ? (
          <mark key={index} className="bg-primary/20 dark:bg-primary/30 font-semibold rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

