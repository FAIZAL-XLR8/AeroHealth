const { GoogleGenAI } = require('@google/genai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const { Embeddings } = require('@langchain/core/embeddings');
const Doctor = require('../models/Doctor');
const { scrapeLybrateDoctors } = require('../services/lybrateScraper');

class CommonJSGoogleGenAIEmbeddings extends Embeddings {
  constructor(fields) {
    super(fields ?? {});
    this.apiKey = fields?.apiKey || process.env.GEMINI_API_KEY;
    this.model = fields?.model || "gemini-embedding-2";
    this.ai = new GoogleGenAI({ apiKey: this.apiKey, apiVersion: 'v1' });
  }

  async embedDocuments(documents) {
    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: documents,
      config: { outputDimensionality: 768 }
    });
    return response.embeddings.map(e => e.values);
  }

  async embedQuery(document) {
    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: document,
      config: { outputDimensionality: 768 }
    });
    return response.embeddings[0].values;
  }
}

const getGenAIClient = () => {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' });
  }
  return null;
};

async function retrieveGuidelinesContext(userQuery) {
  let context = "";
  let ragUsed = false;

  try {
    const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (
      pineconeIndexName &&
      pineconeApiKey  &&
      geminiApiKey
    ) {
      const embeddings = new CommonJSGoogleGenAIEmbeddings();
      const pinecone = new Pinecone({ apiKey: pineconeApiKey });
      const pineconeIndex = pinecone.Index(pineconeIndexName);

      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace: 'assist-triage',
      });
      const searchResultsWithScore = await vectorStore.similaritySearchWithScore(userQuery, 4);
      const relevantResults = searchResultsWithScore.filter(([doc, score]) => score >= 0.60);

      if (relevantResults && relevantResults.length > 0) {
        context = relevantResults.map(([doc, score]) => doc.pageContent).join("\n\n");
        ragUsed = true;
        return {
          context,
          ragUsed
        };
      }
    }
  } catch (err) {
    console.error("⚠️ [RAG] Pinecone retrieval failed:", err.message || err);
  }

  return {
    context: "",
    ragUsed: false
  };
}

exports.handleChatbotMessage = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Conversational history is required." });
    }

    const userMessages = messages.filter(msg => msg.sender === 'user').map(msg => msg.text);
    const combinedQuery = userMessages.join(" ");
    const ai = getGenAIClient();

    if (!ai) {
      return res.status(500).json({ message: "Gemini API key is not configured." });
    }

    const { context, ragUsed } = await retrieveGuidelinesContext(combinedQuery);

    const formattedHistory = [];
    for (const msg of messages) {
      if (msg.type === 'welcome') continue;
      formattedHistory.push({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    const systemInstruction = `
      You are Apollo Assist, a clinical triage and medical recommendation AI assistant.
      Your task is to analyze the conversation and evaluate the patient's symptoms.

      ${ragUsed ? `Below is the reference dataset retrieved from the database mapping diseases, specialties, associated symptoms, and precautions:
      ${context}

      Instructions:
      1. Review the symptoms described by the patient. Compare them against the "Associated Symptoms" of diseases in the reference dataset.
      2. Ask clear, empathetic, and targeted follow-up questions to clarify their symptoms, duration, and severity to narrow down the possible diseases.
      3. Ask only ONE question at a time to keep the patient engaged and not overwhelmed.
      4. Once you have enough context to confidently identify the matching disease and its corresponding medical specialty, you must set the conversation as complete.
      5. To help the patient answer your follow-up questions without having to type manually, you must provide a list of dynamic choice options (like yes/no, duration ranges, or symptom checklists) suitable for the question.
      6. When the conversation is complete (isComplete is true), you MUST formulate the followUpInstructions (Advice) using the specific "Precautions" listed in the reference dataset for the matched disease. Make sure to list these precautions clearly to advise the patient.
      7. You MUST respond with a raw JSON object matching the following structure. Do not output markdown code blocks, do not write any additional text, just the raw JSON.` : `
      Instructions:
      1. Review the symptoms described by the patient.
      2. Ask clear, empathetic, and targeted follow-up questions to clarify their symptoms, duration, and severity.
      3. Ask only ONE question at a time to keep the patient engaged and not overwhelmed.
      4. Once you have enough context to confidently identify the possible disease and its corresponding medical specialty, you must set the conversation as complete.
      5. To help the patient answer your follow-up questions without having to type manually, you must provide a list of dynamic choice options (like yes/no, duration ranges, or symptom checklists) suitable for the question.
      6. When the conversation is complete (isComplete is true), formulate clinical advice under followUpInstructions.
      7. You MUST respond with a raw JSON object matching the following structure. Do not output markdown code blocks, do not write any additional text, just the raw JSON.`}

      JSON Response Schema:
      {
        "isComplete": boolean,
        "triageAnalysis": "Clear, patient-friendly summary explaining the potential disease condition. Leave empty if isComplete is false.",
        "priority": "High" | "Medium" | "Low",
        "specialty": "Cardiologist" | "Dermatologist" | "ENT Specialist" | "General Physician" | "Gastroenterologist" | "Orthopedist" | "Neurologist" | "Endocrinologist" | "Pulmonologist" | "Urologist" | "Dentist" | "Gynaecologist/obstetrician",
        "followUpInstructions": "Empathic clinical advice on what the patient should do next. Leave empty if isComplete is false.",
        "text": "The follow-up question to ask the patient if the conversation is NOT complete. Leave empty if isComplete is true.",
        "options": ["Option A", "Option B", "Option C", "None of these"], // List of choice options for the user to answer the follow-up question. Provide 3-5 appropriate short options. Leave empty if isComplete is true.
        "optionsType": "single" | "multi" // Whether the options are single-choice (one can be selected to send immediately) or multi-choice (multiple checkboxes with confirm button). Leave empty if isComplete is true.
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: formattedHistory,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    let rawText = response.text.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```json|```$/g, '').trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr) {
      return res.status(500).json({ message: "AI response formatting error." });
    }

    if (parsedResult.isComplete && parsedResult.specialty) {
      let formattedSpecialty = parsedResult.specialty;
      if (formattedSpecialty === 'ENT Specialist') {
        formattedSpecialty = 'ENT';
      }

      const recommendedDoctors = await getRecommendedDoctors(formattedSpecialty);
      return res.status(200).json({
        isComplete: true,
        triageAnalysis: parsedResult.triageAnalysis,
        priority: parsedResult.priority,
        specialty: parsedResult.specialty,
        followUpInstructions: parsedResult.followUpInstructions,
        text: `Based on your symptoms, we recommend consulting a ${parsedResult.specialty}. Here is a list of nearby doctors available in Bangalore.`,
        doctors: recommendedDoctors,
        isRagUsed: ragUsed
      });
    }

    return res.status(200).json({
      isComplete: false,
      text: parsedResult.text,
      options: parsedResult.options || [],
      optionsType: parsedResult.optionsType || 'single',
      isRagUsed: ragUsed
    });

  } catch (error) {
    res.status(500).json({ message: "Internal server error during chatbot process." });
  }
};

async function getRecommendedDoctors(specialtyInput) {
  try {
    const { resolveSpecialty } = require('../utils/specialityResolver');
    const resolvedSpecialties = await resolveSpecialty(specialtyInput);

    let matchedDoctors = [];
    const targetSpecialty = resolvedSpecialties[0] || specialtyInput;

    matchedDoctors = await Doctor.find({
      specialization: { $regex: new RegExp('\\b' + targetSpecialty.trim() + '\\b', 'i') },
      status: 'approved',
      isVerified: true
    }).lean();

    if (matchedDoctors.length < 4) {
      const { geocodeAddress } = require('../utils/geocoder');
      const scrapedDocs = await scrapeLybrateDoctors('Bengaluru', targetSpecialty);

      if (scrapedDocs && scrapedDocs.length > 0) {
        const insertPromises = scrapedDocs.map(async (doc) => {
          const exists = await Doctor.findOne({
            name: { $regex: new RegExp('^' + doc.name.trim() + '$', 'i') },
            specialization: { $regex: new RegExp('^' + doc.specialty.trim() + '$', 'i') }
          });
          if (!exists) {
            const nameSlug = doc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const specialtySlug = doc.specialty.toLowerCase().replace(/[^a-z0-9]/g, '');
            const placeholderPhone = 9000000000 + Math.floor(Math.random() * 999999999);

            const coordinates = await geocodeAddress(doc.address);

            return Doctor.create({
              name: doc.name,
              email: `${nameSlug}.${specialtySlug}@lybrate.scraped`,
              password: 'scraped_placeholder_not_for_login',
              phone: placeholderPhone,
              specialization: doc.specialty,
              experienceYears: doc.experience || 0,
              consultationFee: doc.fee || 500,
              isOnline: false,
              lastSeen: new Date(),
              status: 'approved',
              isVerified: true,
              emailVerified: true,
              phoneVerified: true,
              address: doc.address || '',
              location: {
                type: 'Point',
                coordinates,
              },
              activeHours: '09:00 AM - 05:00 PM',
            });
          }
        });

        await Promise.all(insertPromises);

        matchedDoctors = await Doctor.find({
          specialization: { $regex: new RegExp('\\b' + targetSpecialty.trim() + '\\b', 'i') },
          status: 'approved',
          isVerified: true
        }).lean();
      }
    }

    return matchedDoctors.map(doc => ({
      doctorId: doc._id,
      name: doc.name,
      specialty: doc.specialization,
      specialization: doc.specialization,
      experience: doc.experienceYears,
      experienceYears: doc.experienceYears,
      fee: doc.consultationFee,
      consultationFee: doc.consultationFee,
      coordinates: doc.location ? doc.location.coordinates : null,
      activeHours: doc.activeHours,
      address: doc.address || doc.clinicName || '',
    }));
  } catch (error) {
    console.error("❌ [Chatbot Recommended Doctors] Error:", error);
    return [];
  }
}
