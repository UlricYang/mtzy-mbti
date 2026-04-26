/**
 * Normalize MBTI data format for React app consumption.
 * Input JSON may have mbti as a flat object: { type: "INTJ", career_match: ..., personality_insights: ... }
 * React app expects: { "INTJ": { career_match: ..., personality_insights: ... } }
 * If already in correct format (type-keyed dict), returns unchanged.
 */
export function normalizeMbtiData(data: Record<string, unknown>): Record<string, unknown> {
  const mbti = data.mbti as Record<string, unknown>;
  if (!mbti) return data;

  // If mbti has a 'type' key with a string value, it's the flat format
  if ('type' in mbti && typeof mbti.type === 'string') {
    const typeName = mbti.type;
    // Extract all properties except 'type'
    const typeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mbti)) {
      if (key !== 'type') {
        typeData[key] = value;
      }
    }
    // Wrap in type-keyed dictionary
    data.mbti = { [typeName]: typeData };
    console.log(`[NORMALIZE] Converted flat mbti format to type-keyed: { "${typeName}" : {...} }`);
  }

  return data;
}