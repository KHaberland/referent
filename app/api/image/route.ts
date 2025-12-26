import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode, createError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: createError(ErrorCode.CONTENT_REQUIRED) },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: createError(ErrorCode.IMAGE_API_KEY_MISSING) },
        { status: 500 }
      );
    }

    // Используем Stable Diffusion XL через Hugging Face Inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: createError(ErrorCode.AI_RATE_LIMITED) },
          { status: 429 }
        );
      }
      
      if (response.status === 503) {
        // Модель загружается
        return NextResponse.json(
          { error: createError(ErrorCode.AI_SERVICE_UNAVAILABLE, 'Model is loading, please try again in a moment') },
          { status: 503 }
        );
      }
      
      if (response.status >= 500) {
        return NextResponse.json(
          { error: createError(ErrorCode.IMAGE_GENERATION_FAILED, `HTTP ${response.status}`) },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: createError(ErrorCode.IMAGE_GENERATION_FAILED, `HTTP ${response.status}`) },
        { status: response.status }
      );
    }

    // Hugging Face возвращает изображение как бинарные данные
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    return NextResponse.json({ imageUrl: imageDataUrl, prompt });
  } catch (error) {
    console.error('Image generation error:', error);
    
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: createError(ErrorCode.IMAGE_GENERATION_FAILED, details) },
      { status: 500 }
    );
  }
}

