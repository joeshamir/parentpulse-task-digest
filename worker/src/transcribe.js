import Groq from 'groq-sdk';
import { env } from './env.js';

let client;

function getClient() {
  if (!env.groqApiKey) return null;
  if (!client) client = new Groq({ apiKey: env.groqApiKey });
  return client;
}

// Transcribes a Hebrew voice note buffer with whisper-large-v3-turbo.
// Returns '' when transcription is unavailable so callers can skip gracefully.
export async function transcribeVoice(buffer, filename = 'audio.ogg') {
  const groq = getClient();
  if (!groq) return '';
  try {
    const file = new File([buffer], filename, { type: 'audio/ogg' });
    const result = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'he',
      response_format: 'text',
    });
    return typeof result === 'string' ? result : (result?.text ?? '');
  } catch (error) {
    console.error('[whisper] transcription failed:', error.message);
    return '';
  }
}
