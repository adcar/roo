'use client';

import { useEffect, useState } from 'react';
import Model, { IExerciseData, Muscle } from 'react-body-highlighter';

// Re-export types for convenience
export type { IExerciseData, Muscle };

type ModelProps = React.ComponentProps<typeof Model>;

interface BodyHighlighterProps extends Omit<ModelProps, 'highlightedColors'> {
  highlightedColors?: string[];
}

export function BodyHighlighter({ highlightedColors: customColors, ...props }: BodyHighlighterProps) {
  const [themeColors, setThemeColors] = useState<string[]>(['#ef4444', '#f59e0b', '#10b981']);

  useEffect(() => {
    // If custom colors are provided, use them
    if (customColors) {
      setThemeColors(customColors);
      return;
    }

    if (typeof window === 'undefined') return;
    
    const updateColors = () => {
      const root = document.documentElement;
      // Tailwind CSS variables often don't have the "color" part computed directly if they are just HSL values
      // But usually --primary is defined. 
      // The previous implementation created a temp element, which is robust.
      
      const primaryVar = getComputedStyle(root).getPropertyValue('--primary').trim();
      const secondaryVar = getComputedStyle(root).getPropertyValue('--secondary').trim();
      
      const getComputedColor = (colorValue: string) => {
        if (!colorValue) return null;
        const tempEl = document.createElement('div');
        tempEl.style.position = 'absolute';
        tempEl.style.visibility = 'hidden';
        tempEl.style.color = `hsl(${colorValue})`; // Try HSL first as that's common in shadcn/ui
        
        // Check if it's already a color string (hex, rgb, etc) or a variable
        if (!colorValue.includes(' ')) {
            // It might be a variable reference or a simple color
             tempEl.style.color = colorValue;
        }
        
        document.body.appendChild(tempEl);
        const computedColor = getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);
        return computedColor;
      };

      // In shadcn/ui, variables like --primary are usually just HSL values like "222.2 47.4% 11.2%"
      // So we need to wrap them in hsl() if we use them directly, or rely on the class system.
      // The previous implementation in workout/page.tsx did:
      // tempEl.style.color = primaryVar;
      // This assumes primaryVar is a valid color string.
      // If Shadcn is used, it might be "hsl(var(--primary))".
      
      // Let's stick to the implementation that was working in workout/page.tsx but make it safer.
      // In workout/page.tsx:
      // const primaryVar = getComputedStyle(root).getPropertyValue('--primary').trim();
      // tempEl.style.color = primaryVar;
      
      // If --primary is "240 5.9% 10%", then setting style.color = "240 5.9% 10%" is invalid CSS.
      // It needs to be "hsl(240 5.9% 10%)".
      
      // Let's try to detect if it needs hsl wrapping or use a class to get the color.
      
      const tempEl = document.createElement('div');
      tempEl.className = 'bg-primary text-primary'; // Use classes to trigger the variables
      tempEl.style.position = 'absolute';
      tempEl.style.visibility = 'hidden';
      document.body.appendChild(tempEl);
      
      const primaryColor = getComputedStyle(tempEl).color;
      
      tempEl.className = 'bg-secondary text-secondary';
      const secondaryColor = getComputedStyle(tempEl).color;
      
      document.body.removeChild(tempEl);
      
      setThemeColors([
        primaryColor || '#ef4444', 
        secondaryColor || '#f59e0b', 
        '#10b981' // Green for highlight
      ]);
    };

    updateColors();
    
    // Optional: Listen for theme changes if you have a theme switcher
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    
    return () => observer.disconnect();
  }, [customColors]);

  return (
    <Model
      highlightedColors={themeColors}
      {...props}
    />
  );
}


