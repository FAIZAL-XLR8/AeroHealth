const { GoogleGenAI } = require('@google/genai');
const { LYBRATE_SPECIALTIES } = require('../utils/specialities');

const getGenAIClient = () => {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' });
  }
  return null;
};

async function mapSpecialtyWithGemini(inputSpecialty) {
  const ai = getGenAIClient();
  if (!ai) {
    return [];
  }

  const prompt = `
You are a medical specialty mapping assistant.
Your task is to map the patient's requested specialty to the closest matching medical specialties from the whitelisted specialties supported by the platform.

Whitelisted Specialties:
${LYBRATE_SPECIALTIES.join(', ')}

Requested Specialty:
"${inputSpecialty}"

Rules:
1. Map the requested specialty to at most three specialties from the whitelisted specialties list above.
2. Return ONLY a strict JSON array of strings containing the matched specialties, e.g., ["Cardiologist"] or ["Pulmonologist", "General Surgeon"].
3. Do not include markdown code block fences (like \`\`\`json) or any explanation. Return the raw JSON array.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let cleanedText = response.text.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json|```$/g, '').trim();
    }

    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      const validSpecialties = [];
      for (const item of parsed) {
        const matched = LYBRATE_SPECIALTIES.find(
          s => s.toLowerCase() === item.trim().toLowerCase()
        );
        if (matched && !validSpecialties.includes(matched)) {
          validSpecialties.push(matched);
        }
      }
      return validSpecialties.slice(0, 3);
    }
    return [];
  } catch (err) {
    return [];
  }
}

module.exports = {
  mapSpecialtyWithGemini
};
