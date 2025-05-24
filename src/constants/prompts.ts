/**
 * Predefined list of prompts for user profile setup
 */

export interface Prompt {
  id: string;
  text: string;
}

export const PROMPTS: Prompt[] = [
  { id: '1', text: 'The first thing people notice about me is...' },
  { id: '2', text: 'My ideal weekend includes...' },
  { id: '3', text: 'I can\'t live without...' },
  { id: '4', text: 'My biggest passion is...' },
  { id: '5', text: 'My most controversial opinion is...' },
  { id: '6', text: 'The way to my heart is...' },
  { id: '7', text: 'A random fact about me is...' },
  { id: '8', text: 'My favorite travel story is...' },
  { id: '9', text: 'In 5 years, I want to be...' },
  { id: '10', text: 'A perfect date night with me would include...' },
];
