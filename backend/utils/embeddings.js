import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

export class NewGoogleGenAIEmbeddings extends Embeddings {
  constructor(fields) {
    super(fields ?? {});
    this.apiKey = fields?.apiKey || process.env.GEMINI_API_KEY;
    this.model = fields?.model || "gemini-embedding-2";
    this.ai = new GoogleGenAI({ apiKey: this.apiKey, apiVersion: 'v1' });
  }

  async embedDocuments(documents) {
    const chunkArray = (arr, size) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

    const batchSize = 10;
    const batches = chunkArray(documents, batchSize);
    const results = [];

    for (let i = 0; i < batches.length; i++) {
      const chunk = batches[i];
      let attempt = 0;
      let success = false;
      let response;

      while (!success && attempt < 3) {
        try {
          attempt++;
          response = await this.ai.models.embedContent({
            model: this.model,
            contents: chunk,
            config: {
              outputDimensionality: 768
            }
          });
          success = true;
        } catch (err) {
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 45000));
          } else {
            throw err;
          }
        }
      }

      const vectors = response.embeddings.map(e => e.values);
      results.push(...vectors);

      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5500));
      }
    }

    return results;
  }

  async embedQuery(document) {
    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: document,
      config: {
        outputDimensionality: 768
      }
    });
    return response.embeddings[0].values;
  }
}
