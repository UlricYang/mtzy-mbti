#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CSV file
const csvPath = path.join(__dirname, '../public/assets/data/origins/real-celebrities.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.trim().split('\n');

// Skip header line
const [header, ...dataLines] = lines;

// Convert to JSON: key = Name, value = Occupation
const result: Record<string, string> = {};

dataLines.forEach(line => {
  const [name, ...occupationParts] = line.split(',');
  const occupation = occupationParts.join(','); // Handle commas in occupation if any
  result[name.trim()] = occupation.trim();
});

// Write JSON file
const jsonPath = path.join(__dirname, '../public/assets/data/origins/real-celebrities.json');
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

console.log(`Converted ${Object.keys(result).length} celebrities`);
console.log(`Saved to: ${jsonPath}`);
