#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../public/assets/data/mbti-celebrities-occupation.json');
const outputFile = path.join(__dirname, '../public/assets/data/celebrities-by-occupation.json');

const celebrities: Record<string, string> = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const occupationMap: Record<string, string[]> = {};

Object.entries(celebrities).forEach(([name, occupations]) => {
  const occupationList = occupations.split('/').map(o => o.trim());
  
  occupationList.forEach(occupation => {
    if (!occupationMap[occupation]) {
      occupationMap[occupation] = [];
    }
    occupationMap[occupation].push(name);
  });
});

const sortedOccupationMap: Record<string, string[]> = {};
Object.keys(occupationMap)
  .sort((a, b) => occupationMap[b].length - occupationMap[a].length)
  .forEach(key => {
    sortedOccupationMap[key] = occupationMap[key].sort();
  });

fs.writeFileSync(outputFile, JSON.stringify(sortedOccupationMap, null, 2), 'utf8');

console.log(`Processed ${Object.keys(celebrities).length} celebrities`);
console.log(`Found ${Object.keys(sortedOccupationMap).length} unique occupations`);
console.log(`Saved to: ${outputFile}`);
