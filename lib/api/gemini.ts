const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

export interface GeminiVerificationResponse {
  isWorkout: boolean;
  confidence: number;
  reason: string;
}

/**
 * Verify if an image shows a workout/gym context using Gemini Vision API
 * @param imageUri - Local URI or base64 encoded image
 * @returns Verification result with confidence score
 */
export async function verifyWorkoutImage(imageUri: string): Promise<GeminiVerificationResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  try {
    // Convert image to base64 if it's a local URI
    const imageBase64 = await convertImageToBase64(imageUri);

    const prompt = `You are verifying whether a photo shows a person working out or in a gym/fitness setting.
Return JSON only in this exact format: { "isWorkout": true/false, "confidence": 0-1, "reason": "string" }.
Analyze the image and determine if it contains:
- Gym equipment (weights, machines, benches)
- Exercise activities (lifting, running, stretching)
- Fitness attire
- Gym environment

Respond with valid JSON only.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract JSON from the response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    const result: GeminiVerificationResponse = JSON.parse(jsonMatch[0]);

    return {
      isWorkout: result.isWorkout || false,
      confidence: result.confidence || 0,
      reason: result.reason || 'Unable to determine',
    };
  } catch (error) {
    console.error('Gemini verification error:', error);
    throw error;
  }
}

/**
 * Convert image URI to base64 string
 */
async function convertImageToBase64(uri: string): Promise<string> {
  // If already base64, return as is
  if (uri.startsWith('data:')) {
    return uri.split(',')[1];
  }

  // For local file URIs in React Native, use file system
  const FileSystem = require('expo-file-system/legacy');
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  } catch (error) {
    console.error('Error reading file as base64:', error);
    throw new Error('Failed to convert image to base64');
  }
}

