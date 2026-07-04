const Fuse = require("fuse.js");
const { LYBRATE_SPECIALTIES } = require("./specialities.js");
const redisClient = require("../config/redisClient.js");
const { mapSpecialtyWithGemini } = require("../services/geminiService.js");

const fuse = new Fuse(LYBRATE_SPECIALTIES, {
  includeScore: true,
  threshold: 0.3
});

const FALLBACK_MAP = {
  "allergist": ["Dermatologist", "General Physician"],
  "immunologist": ["Dermatologist", "General Physician"],
  "gynaecologist/obstetrician": ["Gynecologist", "Obstetrician"],
  "gynecologist/obstetrician": ["Gynecologist", "Obstetrician"],
  "gynae": ["Gynecologist"],
  "gynec": ["Gynecologist"],
  "physician": ["General Physician"],
  "surgeon": ["General Surgeon"],
  "urology": ["Urologist"],
  "cardiology": ["Cardiologist"],
  "neurology": ["Neurologist"],
  "dermatology": ["Dermatologist"],
  "orthopedics": ["Orthopedic Surgeon"],
  "orthopedist": ["Orthopedic Surgeon"],
  "ortho": ["Orthopedic Surgeon"]
};

const resolveSpecialty = async (userInput) => {
  if (!userInput) return ["General Physician"];

  const trimmedInput = userInput.trim();
  const lowerInput = trimmedInput.toLowerCase();

  const exactMatch = LYBRATE_SPECIALTIES.find(
    s => s.toLowerCase() === lowerInput
  );
  if (exactMatch) {
    return [exactMatch];
  }

  const fuzzy = fuse.search(trimmedInput);
  if (fuzzy.length && fuzzy[0].score <= 0.3) {
    return [fuzzy[0].item];
  }

  if (FALLBACK_MAP[lowerInput]) {
    return FALLBACK_MAP[lowerInput];
  }

  const redisKey = `specialty:${lowerInput}`;
  try {
    const cached = await redisClient.get(redisKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheErr) {
  }

  const geminiResult = await mapSpecialtyWithGemini(trimmedInput);

  const finalResult = geminiResult.length > 0 ? geminiResult : ["General Physician"];

  try {
    await redisClient.set(redisKey, JSON.stringify(finalResult));
  } catch (cacheErr) {

  }

  return finalResult;
};

module.exports = {
  resolveSpecialty
};
