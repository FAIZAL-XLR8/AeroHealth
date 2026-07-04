const { GoogleGenAI } = require('@google/genai');
const User = require('../models/User');

const getGenAIClient = () => {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' });
  }
  return null;
};

exports.analyzeReport = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : req.body.userId;

    if (!req.file) {
      return res.status(400).json({ message: 'No medical report file (PDF or image) uploaded.' });
    }

    const ai = getGenAIClient();
    let analysisResult;

    if (ai) {
      const fileData = {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype,
        },
      };

      const systemPrompt = `
        You are a highly analytical medical report analyzer. Read this laboratory diagnostic report document.
        Extract the following parameters and return a strict, clean JSON output matching the following key structure exactly.
        Do not add any markdown, code blocks, or leading text, return only raw JSON.

        JSON structure:
        {
          "patientName": "Full Name",
          "testsIdentified": ["List of tests found, e.g. Lipid Profile, CBC"],
          "criticalAlerts": ["Highlight any abnormal, high, low, or out-of-range metrics with values"],
          "medicationsIdentified": ["Any medications mentioned"],
          "recommendedSpecialist": "Specific Doctor Specialty (e.g. Cardiologist, ENT, General Physician, Endocrinologist)",
          "suggestedFollowUpTests": ["Tests to consult, e.g., HbA1c, Liver Function"],
          "fullSummary": "Provide a simple, 3-sentence, patient-friendly explanation of their report status."
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [fileData, systemPrompt],
      });

      try {
        let cleanedJson = response.text.trim();
        if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```json|```$/g, '').trim();
        }
        analysisResult = JSON.parse(cleanedJson);
      } catch (jsonErr) {
        return res.status(500).json({ message: 'AI error, please try again after some time.' });
      }
    } else {
      return res.status(500).json({ message: 'AI error, please try again after some time.' });
    }



    res.status(200).json({
      message: 'Medical report parsed successfully.',
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('Error in analyzeReport controller:', error);
    res.status(500).json({ message: 'AI error, please try again after some time.' });
  }
};


exports.chatTriage = async (req, res) => {
  try {
    const { message, city = 'Bengaluru', stage = 'initial', specialist: reqSpecialist, priority: reqPriority, analysis: reqAnalysis, answers = [] } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message parameter is required.' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ message: 'AI error, please try again after some time.' });
    }

    const parseGeminiJson = (text) => {
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```json|```$/g, '').trim();
      }
      return JSON.parse(cleaned);
    };

    if (stage === 'initial') {
      const prompt = `
        You are a clinical triage assistant.
        Analyze the patient's symptom description: "${message}"

        1. Map the symptoms to the single most appropriate medical specialty from this exact list:
           [Dentist, Gynaecologist/obstetrician, General Physician, Dermatologist, ENT Specialist, Homoeopath, Ayurveda, Cardiologist, Neurologist, Pediatrician, Orthopedist, Oncologist, Psychiatrist, Urologist, Gastroenterologist, Pulmonologist, Endocrinologist, Nephrologist, Ophthalmologist, Physiotherapist, Sexologist, Dietitian]

        2. Determine triage priority: High (urgent/severe), Medium (needs attention soon), or Low (non-urgent).

        3. Formulate a single, patient-friendly follow-up multiple-choice question to clarify their symptoms or narrow down the concern. Provide exactly 3 or 4 relevant, distinct options.

        Return a clean, strict JSON object. Do not wrap in markdown or add code fences.
        JSON structure:
        {
          "analysis": "A brief patient-friendly clinical summary of what their symptoms could indicate.",
          "priority": "High / Medium / Low",
          "specialist": "The exact specialty name from the list",
          "questionText": "Follow-up question string",
          "options": ["Option 1", "Option 2", "Option 3"]
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      let triageResult;
      try {
        triageResult = parseGeminiJson(response.text);
      } catch (jsonErr) {
        return res.status(500).json({ message: 'AI error, please try again after some time.' });
      }

      return res.status(200).json({
        stage: 'question1',
        specialist: triageResult.specialist,
        priority: triageResult.priority,
        analysis: triageResult.analysis,
        questionText: triageResult.questionText,
        options: triageResult.options,
        answers: []
      });
    }

    if (stage === 'question1') {
      const updatedAnswers = [...answers, message];
      const prompt = `
        You are a clinical triage assistant.
        The patient described their symptoms as: "${reqAnalysis}"
        Their matching specialty is: "${reqSpecialist}"
        The patient's answer to the first follow-up question is: "${message}"

        Formulate a second and final patient-friendly follow-up multiple-choice question to further clarify their condition or symptom severity. Provide exactly 3 or 4 relevant, distinct options.

        Return a clean, strict JSON object. Do not wrap in markdown or add code fences.
        JSON structure:
        {
          "questionText": "Final follow-up question string",
          "options": ["Option 1", "Option 2", "Option 3"]
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      let triageResult;
      try {
        triageResult = parseGeminiJson(response.text);
      } catch (jsonErr) {
        return res.status(500).json({ message: 'AI error, please try again after some time.' });
      }

      return res.status(200).json({
        stage: 'question2',
        specialist: reqSpecialist,
        priority: reqPriority || 'Medium',
        analysis: reqAnalysis || '',
        questionText: triageResult.questionText,
        options: triageResult.options,
        answers: updatedAnswers
      });
    }

    if (stage === 'question2') {
      const updatedAnswers = [...answers, message];
      const specialty = reqSpecialist;
      const priority = reqPriority || 'Medium';

      const prompt = `
        You are a clinical triage assistant.
        The patient initially reported symptoms: "${reqAnalysis}"
        Specialty: "${reqSpecialist}"
        Answer to follow-up question 1: "${answers[0]}"
        Answer to follow-up question 2: "${message}"

        Provide a final, consolidated symptom analysis summary (2-3 sentences max) recommending physical consultation or steps, factoring in all of these details.

        Return a clean, strict JSON object. Do not wrap in markdown or add code fences.
        JSON structure:
        {
          "finalSummary": "Consolidated summary string"
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      let triageResult;
      try {
        triageResult = parseGeminiJson(response.text);
      } catch (jsonErr) {
        return res.status(500).json({ message: 'AI error, please try again after some time.' });
      }

      const finalAnalysis = triageResult.finalSummary;

      const Doctor = require('../models/Doctor');
      const { scrapeLybrateDoctors } = require('../services/lybrateScraper');
      const { geocodeAddress } = require('../utils/geocoder');

      const searchCity = city;

      let matchedDoctors = await Doctor.find({
        specialization: { $regex: new RegExp('\\b' + specialty.trim() + '\\b', 'i') },
        status: 'approved',
        isVerified: true
      }).lean();

      if (matchedDoctors.length < 4) {
        try {
          const scrapedDocs = await scrapeLybrateDoctors(searchCity || 'Bengaluru', specialty);

          if (scrapedDocs && scrapedDocs.length > 0) {
            for (const doc of scrapedDocs) {
              const exists = await Doctor.findOne({
                name: { $regex: new RegExp('^' + doc.name.trim() + '$', 'i') },
                specialization: { $regex: new RegExp('^' + doc.specialty.trim() + '$', 'i') }
              });

              if (!exists) {
                const nameSlug = doc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const specialtySlug = doc.specialty.toLowerCase().replace(/[^a-z0-9]/g, '');
                const placeholderPhone = 9000000000 + Math.floor(Math.random() * 999999999);

                const coordinates = await geocodeAddress(doc.address);

                await Doctor.create({
                  name: doc.name,
                  email: `${nameSlug}.${specialtySlug}@lybrate.scraped`,
                  password: 'scraped_placeholder_not_for_login',
                  phone: placeholderPhone,
                  specialization: doc.specialty,
                  experienceYears: doc.experience || 0,
                  consultationFee: doc.fee || 500,
                  status: 'approved',
                  isVerified: true,
                  address: doc.address || '',
                  location: {
                    type: 'Point',
                    coordinates,
                  },
                });
              }
            }

            matchedDoctors = await Doctor.find({
              specialization: { $regex: new RegExp('\\b' + specialty.trim() + '\\b', 'i') },
              status: 'approved',
              isVerified: true
            }).lean();
          }
        } catch (scrapeErr) {
        }
      }
      const doctors = matchedDoctors.slice(0, 5).map(doc => ({
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
        profileImage: doc.profileImage || '',
        isOnline: doc.isOnline,
        address: doc.address || doc.clinicName || '',
      }));

      return res.status(200).json({
        stage: 'completed',
        analysis: finalAnalysis,
        priority,
        specialist: specialty,
        doctors
      });
    }

    res.status(400).json({ message: 'Invalid stage parameter.' });
  } catch (error) {
    res.status(500).json({ message: 'AI error, please try again after some time.' });
  }
};
