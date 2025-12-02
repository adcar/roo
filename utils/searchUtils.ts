// Synonym mappings for exercise search
const SYNONYMS: Record<string, string[]> = {
  'db': ['dumbbell', 'dumbell'],
  'dumbbell': ['db', 'dumbell'],
  'bb': ['barbell', 'bar'],
  'barbell': ['bb', 'bar'],
  'bw': ['bodyweight', 'body weight', 'body-only'],
  'bodyweight': ['bw', 'body weight', 'body-only'],
  'body weight': ['bw', 'bodyweight', 'body-only'],
  'body-only': ['bw', 'bodyweight', 'body weight'],
  'kettlebell': ['kb'],
  'kb': ['kettlebell'],
  'cable': ['cables'],
  'cables': ['cable'],
};

// Expand search query with synonyms
function expandQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const expanded: string[] = [query.toLowerCase()];
  
  // For each word, check if it has synonyms and create variations
  words.forEach((word, index) => {
    const synonyms = SYNONYMS[word];
    if (synonyms) {
      synonyms.forEach(synonym => {
        const variation = [...words];
        variation[index] = synonym;
        expanded.push(variation.join(' '));
      });
    }
  });
  
  return [...new Set(expanded)]; // Remove duplicates
}

// Check if all search words appear in the text (word-based matching)
function matchesWords(searchTerms: string[], text: string): boolean {
  const textLower = text.toLowerCase();
  
  // Check if all search terms appear in the text
  return searchTerms.every(term => {
    // Try exact word match first (word boundaries)
    const wordBoundaryRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordBoundaryRegex.test(textLower)) {
      return true;
    }
    // Then try substring match anywhere in the text
    return textLower.includes(term);
  });
}

// Find match positions for highlighting
export interface MatchInfo {
  start: number;
  end: number;
}

export function findMatches(text: string, query: string): MatchInfo[] {
  if (!query.trim()) return [];
  
  const expandedQueries = expandQuery(query);
  const matches: MatchInfo[] = [];
  const textLower = text.toLowerCase();
  
  // Use the first expanded query (original) for highlighting to avoid over-highlighting
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  // Also check synonyms for highlighting
  const allTerms = new Set<string>(searchTerms);
  searchTerms.forEach(term => {
    const synonyms = SYNONYMS[term];
    if (synonyms) {
      synonyms.forEach(syn => allTerms.add(syn));
    }
  });
  
  // Find matches for all terms (including synonyms)
  allTerms.forEach(term => {
    // Try to match whole words first
    const wordBoundaryRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match;
    while ((match = wordBoundaryRegex.exec(textLower)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Also find substring matches (but avoid duplicates)
    let startIndex = 0;
    while (true) {
      const index = textLower.indexOf(term, startIndex);
      if (index === -1) break;
      
      // Check if this match is already covered by a word boundary match
      const alreadyCovered = matches.some(m => 
        m.start <= index && m.end >= index + term.length
      );
      
      if (!alreadyCovered) {
        matches.push({
          start: index,
          end: index + term.length
        });
      }
      
      startIndex = index + 1;
    }
  });
  
  // Merge overlapping matches
  if (matches.length === 0) return [];
  
  matches.sort((a, b) => a.start - b.start);
  const merged: MatchInfo[] = [matches[0]];
  
  for (let i = 1; i < matches.length; i++) {
    const last = merged[merged.length - 1];
    const current = matches[i];
    
    if (current.start <= last.end) {
      // Overlapping or adjacent, merge them
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

// Check if exercise matches search query
export function exerciseMatchesSearch(exerciseName: string, query: string): boolean {
  if (!query.trim()) return true;
  
  const expandedQueries = expandQuery(query);
  const exerciseLower = exerciseName.toLowerCase();
  
  return expandedQueries.some(expandedQuery => {
    const searchTerms = expandedQuery.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) return true;
    
    // Check if all search terms appear in the exercise name
    return matchesWords(searchTerms, exerciseLower);
  });
}

