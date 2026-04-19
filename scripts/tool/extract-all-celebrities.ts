#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PersonalityEntry {
  名人?: string[];
  [key: string]: unknown;
}

// Read the JSON file
const jsonPath = path.join(__dirname, '../public/assets/data/mbti-types.json');
const data: PersonalityEntry[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Extract all celebrities from all personality types
const allCelebrities: string[] = [];
data.forEach(personality => {
  if (personality['名人'] && Array.isArray(personality['名人'])) {
    personality['名人'].forEach(celebrity => {
      // Clean up the name - remove parentheses and extra content
      const cleanName = celebrity.split('（')[0].replace(/[”“]/g, '').trim();
      allCelebrities.push(cleanName);
    });
  }
});

console.log(`Total celebrities found: ${allCelebrities.length}`);
console.log('All celebrities:');
console.log(allCelebrities.join('\n'));

// Write to a text file
const outputPath = path.join(__dirname, '../all-celebrities.txt');
fs.writeFileSync(outputPath, allCelebrities.join('\n'), 'utf8');
console.log(`\nSaved to: ${outputPath}`);
