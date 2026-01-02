// Media utilities for extracting thumbnails and generating images

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get YouTube thumbnail URLs (returns multiple quality options)
 */
export function getYouTubeThumbnails(videoId: string): {
  maxres: string;
  high: string;
  medium: string;
  default: string;
} {
  return {
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
  };
}

/**
 * Get best available YouTube thumbnail
 */
export async function getBestYouTubeThumbnail(videoId: string): Promise<string> {
  const thumbnails = getYouTubeThumbnails(videoId);

  // Try maxres first, fall back to high quality
  try {
    const response = await fetch(thumbnails.maxres, { method: 'HEAD' });
    if (response.ok) return thumbnails.maxres;
  } catch {}

  return thumbnails.high; // High quality is always available
}

/**
 * Extract Reddit post ID from URL
 */
export function extractRedditPostId(url: string): string | null {
  const patterns = [
    /reddit\.com\/r\/[^/]+\/comments\/([a-z0-9]+)/i,
    /redd\.it\/([a-z0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Platform detection from URL
 */
export type Platform = 'twitter' | 'youtube' | 'reddit' | 'unknown';

export function detectPlatform(url: string): Platform {
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/reddit\.com|redd\.it/.test(url)) return 'reddit';
  return 'unknown';
}

/**
 * Generate a placeholder image URL using a gradient service or local generation
 */
export function getPlaceholderImage(seed: string, width = 400, height = 300): string {
  // Use a deterministic gradient based on seed
  const hash = seed.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  // Could use placeholder services like:
  // - https://placeholder.pics/svg/${width}x${height}
  // - Generate SVG data URL

  const colors = [
    ['8B5CF6', '6366F1'], // Purple to Indigo
    ['EC4899', '8B5CF6'], // Pink to Purple
    ['3B82F6', '06B6D4'], // Blue to Cyan
    ['F97316', 'EF4444'], // Orange to Red
    ['10B981', '06B6D4'], // Green to Cyan
    ['6366F1', 'EC4899'], // Indigo to Pink
  ];

  const [color1, color2] = colors[Math.abs(hash) % colors.length];

  // Return SVG data URL
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#${color1}"/>
        <stop offset="100%" style="stop-color:#${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Image generation configuration
 */
export interface ImageGenerationConfig {
  provider: 'openai' | 'stability' | 'replicate' | 'fal';
  apiKey: string;
  model?: string;
}

/**
 * Generate an image using AI based on text prompt
 */
export async function generateImage(
  prompt: string,
  config: ImageGenerationConfig
): Promise<{ url: string; error?: string }> {
  try {
    switch (config.provider) {
      case 'openai':
        return await generateWithOpenAI(prompt, config.apiKey, config.model);
      case 'stability':
        return await generateWithStability(prompt, config.apiKey, config.model);
      case 'replicate':
        return await generateWithReplicate(prompt, config.apiKey, config.model);
      case 'fal':
        return await generateWithFal(prompt, config.apiKey, config.model);
      default:
        return { url: '', error: 'Unknown provider' };
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return { url: '', error: error instanceof Error ? error.message : 'Generation failed' };
  }
}

async function generateWithOpenAI(prompt: string, apiKey: string, model = 'dall-e-3'): Promise<{ url: string; error?: string }> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: `Create a visually appealing thumbnail image for: ${prompt}. Style: modern, clean, educational, vibrant colors.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { url: '', error: error.error?.message || 'OpenAI API error' };
  }

  const data = await response.json();
  return { url: data.data[0]?.url || '' };
}

async function generateWithStability(prompt: string, apiKey: string, model = 'stable-diffusion-xl-1024-v1-0'): Promise<{ url: string; error?: string }> {
  const response = await fetch(`https://api.stability.ai/v1/generation/${model}/text-to-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [
        {
          text: `Create a visually appealing thumbnail image for: ${prompt}. Style: modern, clean, educational.`,
          weight: 1,
        },
      ],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { url: '', error: error.message || 'Stability API error' };
  }

  const data = await response.json();
  const base64 = data.artifacts?.[0]?.base64;
  if (base64) {
    return { url: `data:image/png;base64,${base64}` };
  }
  return { url: '', error: 'No image generated' };
}

async function generateWithReplicate(prompt: string, apiKey: string, model = 'stability-ai/sdxl'): Promise<{ url: string; error?: string }> {
  // Start prediction
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model,
      input: {
        prompt: `Create a visually appealing thumbnail image for: ${prompt}. Style: modern, clean, educational.`,
        width: 1024,
        height: 1024,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { url: '', error: error.detail || 'Replicate API error' };
  }

  const prediction = await response.json();

  // Poll for completion
  let result = prediction;
  while (result.status === 'starting' || result.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollResponse = await fetch(result.urls.get, {
      headers: { 'Authorization': `Token ${apiKey}` },
    });
    result = await pollResponse.json();
  }

  if (result.status === 'succeeded' && result.output) {
    return { url: Array.isArray(result.output) ? result.output[0] : result.output };
  }

  return { url: '', error: result.error || 'Generation failed' };
}

async function generateWithFal(prompt: string, apiKey: string, model = 'fal-ai/fast-sdxl'): Promise<{ url: string; error?: string }> {
  const response = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `Create a visually appealing thumbnail image for: ${prompt}. Style: modern, clean, educational.`,
      image_size: 'landscape_16_9',
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { url: '', error: error.detail || 'Fal API error' };
  }

  const data = await response.json();
  return { url: data.images?.[0]?.url || '' };
}

/**
 * Create prompt for image generation based on content
 */
export function createImagePrompt(content: string, topics: string[] = [], platform: string = ''): string {
  const topicsText = topics.length > 0 ? `Topics: ${topics.slice(0, 3).join(', ')}. ` : '';
  const platformText = platform ? `Platform: ${platform}. ` : '';

  // Truncate content to first 200 chars for prompt
  const contentSummary = content.length > 200 ? content.slice(0, 200) + '...' : content;

  return `${platformText}${topicsText}Content: ${contentSummary}`;
}
