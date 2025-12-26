import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode, createError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: createError(ErrorCode.CONTENT_REQUIRED) },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: createError(ErrorCode.AI_API_KEY_MISSING) },
        { status: 500 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Article Analyzer',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating prompts for AI image generation. Your task is to read an article and create a vivid, detailed prompt for generating an illustration that captures the essence of the article.

Requirements for the prompt:
- Write the prompt in English only
- The prompt should be 1-3 sentences, descriptive and visual
- Focus on the main theme, mood, and key visual elements
- Include artistic style suggestions (e.g., digital art, illustration, photorealistic, etc.)
- Do NOT include any explanations, just output the prompt itself
- Make it suitable for Stable Diffusion or similar image generation models
- Avoid text, logos, or specific brand references in the description`
          },
          {
            role: 'user',
            content: `Create an image generation prompt based on this article:\n\n${title ? `Title: ${title}\n\n` : ''}${content.substring(0, 3000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: createError(ErrorCode.AI_RATE_LIMITED) },
          { status: 429 }
        );
      }
      
      if (response.status >= 500) {
        return NextResponse.json(
          { error: createError(ErrorCode.AI_SERVICE_UNAVAILABLE) },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: createError(ErrorCode.AI_SERVICE_ERROR, `HTTP ${response.status}`) },
        { status: response.status }
      );
    }

    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content?.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: createError(ErrorCode.AI_SERVICE_ERROR, 'Empty response from AI') },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Image prompt error:', error);
    
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: createError(ErrorCode.AI_SERVICE_ERROR, details) },
      { status: 500 }
    );
  }
}

