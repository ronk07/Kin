const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface VerificationResponse {
  isVerified: boolean;
  confidence: number;
  reason: string;
  model?: string;
}

export type TaskType = 'workout' | 'bible_reading';

const SYSTEM_PROMPT = `You are an assistant for the Kin family accountability app. Families use Kin to stay consistent with their health and faith goals.
You will receive a user-submitted photo and details about the task they claim to have completed.
Your job is to carefully analyze the photo and respond with a JSON object that indicates whether the image appears to match the task.
The JSON you return must follow this exact TypeScript interface:

interface VerificationResponse {
  isVerified: boolean; // true if the image clearly matches the task, otherwise false
  confidence: number;  // number between 0 and 1 indicating confidence in your judgment
  reason: string;      // short sentence (max 200 chars) explaining your reasoning for the result
}

Rules:
- Only respond with JSON that matches the interface exactly.
- confidence must be between 0 and 1 (inclusive).
- reason must be concise and reference visual evidence (or lack of it).
- If the image is blurry or unrelated, set isVerified to false and explain why.`;

function buildTaskPrompt(taskType: TaskType): string {
  if (taskType === 'workout') {
    return `Task: Verify if this photo shows someone working out or engaging in a fitness activity.
Look for:
- Presence of gym equipment, workout gear, or exercise movements.
- Context that clearly indicates a workout (gym setting, weights, cardio machines, etc.).

If the evidence is unclear or missing, set isVerified to false.`;
  }

  return `Task: Verify if this photo shows someone reading the Bible or engaging in Bible study.
Look for:
- An open Bible or digital scripture clearly visible.
- A person actively reading or studying the Bible.
- Context that indicates faith-based study.

If the evidence is unclear or missing, set isVerified to false.`;
}

export async function verifyTaskImage(imageUri: string, taskType: TaskType): Promise<VerificationResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY.');
  }

  try {
    const imageBase64 = await convertImageToBase64(imageUri);
    const prompt = buildTaskPrompt(taskType);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Failed to parse OpenAI response: empty content');
    }

    let result: VerificationResponse;
    try {
      result = JSON.parse(content);
    } catch (error) {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    return {
      isVerified: Boolean(result.isVerified),
      confidence: clampConfidence(result.confidence),
      reason: result.reason?.toString().slice(0, 200) || 'No reasoning provided',
      model: OPENAI_MODEL,
    };
  } catch (error) {
    console.error('OpenAI verification error:', error);
    throw error;
  }
}

export async function verifyWorkoutImage(imageUri: string): Promise<VerificationResponse> {
  return verifyTaskImage(imageUri, 'workout');
}

function clampConfidence(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

async function convertImageToBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    return uri.split(',')[1];
  }

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
