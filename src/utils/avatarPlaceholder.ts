// src/utils/avatarPlaceholder.ts
// Utility function to generate avatar placeholders with initials

/**
 * Generate a color based on a string (like a name or ID)
 * This provides consistent colors for the same input
 */
export function getColorFromString(str: string): string {
  // Default color if string is empty
  if (!str) return '#FF6B6B';

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate a HSL color with good saturation and lightness for visibility
  const h = Math.abs(hash % 360);
  const s = 65 + (hash % 20); // Between 65-85% saturation
  const l = 55 + (hash % 10); // Between 55-65% lightness
  
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Get the first letter of each word in a name, up to 2 letters
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  
  // Split by spaces and get first letter of each part
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    // Just get the first letter if it's a single word
    return parts[0].charAt(0).toUpperCase();
  }
  
  // Get first letter of first and last parts
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default {
  getColorFromString,
  getInitials
};
