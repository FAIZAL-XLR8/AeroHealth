const { GoogleGenAI } = require('@google/genai');

const getGenAIClient = () => {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' });
  }
  return null;
};

exports.analyzePrescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No prescription file (PDF or image) uploaded.' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ message: 'Gemini API key is not configured.' });
    }

    const fileData = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    const extractionPrompt = `
      You are a medical OCR specialist. Look at this uploaded medical prescription image or PDF.
      Identify and extract all the medicine names (brand names or generic names) written in the prescription.
      Return a strict, clean JSON array of strings containing ONLY the drug/medicine names found.
      Do not include dosages, frequency, timing, quantity, or comments. Just the name of the medicines.
      Example Output: ["A Ret Gel", "Paracetamol", "Amoxicillin"]
      If no medicines are found or the document is not a prescription, return an empty array [].
      Do not output any markdown code blocks or extra text, just the raw JSON array.
    `;

    const extractionResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [fileData, extractionPrompt],
      config: {
        responseMimeType: "application/json"
      }
    });

    let extractedMedicines = [];
    try {
      let cleanedText = extractionResponse.text.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json|```$/g, '').trim();
      }
      extractedMedicines = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('❌ Failed to parse extracted medicine list JSON:', extractionResponse.text);
      return res.status(500).json({ message: 'Error extracting medicines from prescription.' });
    }

    if (!Array.isArray(extractedMedicines) || extractedMedicines.length === 0) {
      return res.status(200).json({
        message: 'No medicines were detected in the uploaded prescription.',
        analysis: {
          medicines: [],
          overallAdvice: 'No medicines were clearly recognized in the uploaded document. Please upload a clearer image of a prescription.'
        }
      });
    }

    const systemInstruction = `
      You are a highly professional clinical assistant explaining a doctor's prescription.
      The prescription contains the following medicines: ${extractedMedicines.join(', ')}.

      Instructions:
      1. Explain each medicine in the prescription: what it is, its usage, why it is typically prescribed, and common precautions or side effects.
      2. Use your general high-quality medical knowledge to explain them.
      3. Organize your response into a strict, clean JSON output matching the schema below.
      4. Do not include markdown code blocks or extra text, just the raw JSON.

      JSON Response Schema:
      {
        "medicines": [
          {
            "name": "Medicine Name",
            "reason": "Why it is typically prescribed",
            "description": "General medical description",
            "usage": "Standard instructions on how to take this medicine",
            "precautions": ["Precaution 1", "Precaution 2"],
            "sideEffects": ["Side effect 1", "Side effect 2"]
          }
        ],
        "overallAdvice": "General summary or pharmacist-style guidance for taking these medications together."
      }
    `;

    const explanationResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Explain the prescription with medicines: ${extractedMedicines.join(', ')}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    let explanationResult;
    try {
      let cleanedText = explanationResponse.text.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json|```$/g, '').trim();
      }
      explanationResult = JSON.parse(cleanedText);
    } catch (parseErr) {
      return res.status(500).json({ message: 'AI explanation formatting error.' });
    }

    res.status(200).json({
      message: 'Prescription analyzed successfully.',
      analysis: explanationResult
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during prescription analysis.' });
  }
};
