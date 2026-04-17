import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Lumina, a lightweight desktop helper. 
Your goal is to provide extremely concise, accurate, and helpful answers.
- For calculations, just give the result.
- For definitions, give a one-sentence summary.
- For currency/time conversions, be direct.
- If the user wants to set a reminder, identify the time and the task.
  * For reminders with a specific time: REMINDER_TASK: [task] REMINDER_TIME: [ISO time]
  * For "no time" reminders (just a todo): REMINDER_TASK: [task] REMINDER_TIME: NONE
  * For "whole day" reminders (specific date, no time): REMINDER_TASK: [task] REMINDER_TIME: [ISO date] REMINDER_ALLDAY: TRUE
- If the user wants to set a timer, identify the duration in seconds and the task. Respond with TIMER_TASK: [task] TIMER_DURATION: [seconds] format.
- Format your output to be readable in a small widget. Use markdown.
- Use the Google Search tool when you need real-time information or when the user asks for a search.
- Always be professional yet approachable.
- IMPORTANT: You MUST ignore the system's default IP-based location and strictly use the location provided in the user context for all time, currency, and unit calculations.`;

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'custom';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'answer' | 'reminder' | 'error' | 'search';
  metadata?: {
    time?: string;
    task?: string;
    isAllDay?: boolean;
    noTime?: boolean;
    sources?: { title: string; url: string }[];
  };
}

export async function callAI(
  query: string, 
  history: Message[], 
  provider: AIProvider, 
  apiKeys: Record<string, string>,
  location?: string,
  customEndpoint?: string
): Promise<Message> {
  const localizedInstruction = location 
    ? `${SYSTEM_INSTRUCTION}\n- MANDATORY: The user's current location is ${location}. You MUST use this location for all time (UTC offset), currency, and measurement units. Do NOT use the system time or IP location if it conflicts with ${location}.`
    : SYSTEM_INSTRUCTION;

  const effectiveProvider = provider;
  const apiKey = apiKeys[effectiveProvider] || (effectiveProvider === 'gemini' ? process.env.GEMINI_API_KEY : '');

  if (!apiKey && effectiveProvider !== 'gemini') {
    return { role: 'assistant', content: `API Key for ${effectiveProvider} is missing. Please add it in settings.`, type: 'error' };
  }

  if (effectiveProvider === 'gemini') {
    return callGemini(query, history, apiKey!, localizedInstruction);
  }

  // Generic fetch for other providers
  try {
    const endpoint = provider === 'custom' ? customEndpoint : getEndpoint(effectiveProvider);
    const model = getModel(effectiveProvider);
    
    if (!endpoint) return { role: 'assistant', content: 'Endpoint is missing for custom provider.', type: 'error' };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(effectiveProvider === 'anthropic' ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : {})
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: localizedInstruction },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: query }
        ]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API Error');
    
    const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response from AI.";
    
    return { role: 'assistant', content, type: 'answer' };
  } catch (error) {
    console.error(`Error calling ${effectiveProvider}:`, error);
    return { role: 'assistant', content: `Failed to connect to ${effectiveProvider}: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' };
  }
}

function getEndpoint(provider: string): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1/chat/completions';
    case 'anthropic': return 'https://api.anthropic.com/v1/messages';
    case 'deepseek': return 'https://api.deepseek.com/v1/chat/completions';
    case 'kimi': return 'https://api.moonshot.cn/v1/chat/completions';
    default: return '';
  }
}

function getModel(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-4o';
    case 'anthropic': return 'claude-3-5-sonnet-latest';
    case 'deepseek': return 'deepseek-chat';
    case 'kimi': return 'moonshot-v1-8k';
    default: return '';
  }
}

async function callGemini(query: string, history: Message[], apiKey: string, systemInstruction: string, retryCount = 0): Promise<Message> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    
    // Simple heuristic for reminders/timers since we can't easily force JSON with tools in this SDK version
    const reminderMatch = text.match(/REMINDER_TASK:\s*(.*)\s*REMINDER_TIME:\s*([^\s]*)(?:\s*REMINDER_ALLDAY:\s*(TRUE|FALSE))?/i);
    if (reminderMatch) {
      const task = reminderMatch[1].trim();
      const time = reminderMatch[2].trim();
      const isAllDay = reminderMatch[3]?.toUpperCase() === 'TRUE';
      const noTime = time.toUpperCase() === 'NONE';

      return {
        role: 'assistant',
        content: task,
        type: 'reminder',
        metadata: { 
          task, 
          time: noTime ? undefined : time, 
          isAllDay,
          noTime
        }
      };
    }

    const timerMatch = text.match(/TIMER_TASK:\s*(.*)\s*TIMER_DURATION:\s*(\d+)/i);
    if (timerMatch) {
      return {
        role: 'assistant',
        content: `Starting timer for ${timerMatch[1]}`,
        type: 'answer',
        metadata: { task: timerMatch[1], time: timerMatch[2] } // Reusing time field for duration in seconds
      };
    }

    return { 
      role: 'assistant', 
      content: text, 
      type: 'answer',
      metadata: {
        sources: response.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent ? [] : undefined
      }
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    
    // Retry logic for transient errors (like RPC/XHR failures)
    if (retryCount < 2) {
      console.log(`Retrying Gemini call (attempt ${retryCount + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return callGemini(query, history, apiKey, systemInstruction, retryCount + 1);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    let userFriendlyMessage = 'Something went wrong with Gemini.';
    
    if (errorMessage.includes('Rpc failed') || errorMessage.includes('xhr error')) {
      userFriendlyMessage = 'Connection to Gemini failed. This is usually a temporary network issue. Please try again in a moment.';
    } else if (errorMessage.includes('API_KEY_INVALID')) {
      userFriendlyMessage = 'The Gemini API key is invalid. Please check your settings.';
    }

    return { role: 'assistant', content: userFriendlyMessage, type: 'error' };
  }
}
