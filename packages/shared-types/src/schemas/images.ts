import { z } from 'zod';

// Images schema for AI-generated and managed images
export const ImagesSchema = z.object({
  hero: z.object({
    background: z.string().url(),
    overlay: z.string().url().optional(),
    mobile: z.string().url().optional(),
  }),
  backgrounds: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().url(),
    alt: z.string(),
    type: z.enum(['hero', 'section', 'product', 'testimonial']),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
    }),
    formats: z.array(z.enum(['webp', 'jpg', 'png', 'avif'])),
    sizes: z.array(z.string()),
  })),
  productImages: z.array(z.object({
    id: z.string(),
    productId: z.string(),
    url: z.string().url(),
    alt: z.string(),
    order: z.number(),
    type: z.enum(['main', 'gallery', 'thumbnail']),
    variants: z.array(z.object({
      size: z.string(),
      url: z.string().url(),
      width: z.number(),
      height: z.number(),
    })),
    aiGenerated: z.boolean(),
    prompt: z.string().optional(),
  })),
  banners: z.array(z.object({
    id: z.string(),
    title: z.string(),
    url: z.string().url(),
    alt: z.string(),
    link: z.string().url().optional(),
    active: z.boolean(),
    position: z.enum(['top', 'bottom', 'sidebar', 'popup']),
    mobile: z.string().url().optional(),
  })),
  icons: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().url(),
    category: z.enum(['social', 'payment', 'feature', 'navigation']),
    size: z.enum(['16', '24', '32', '48', '64']),
    format: z.enum(['svg', 'png', 'webp']),
  })),
  logos: z.object({
    main: z.string().url(),
    white: z.string().url().optional(),
    black: z.string().url().optional(),
    favicon: z.string().url(),
    appleTouch: z.string().url().optional(),
    androidChrome: z.string().url().optional(),
    sizes: z.array(z.string()),
  }),
  gallery: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    images: z.array(z.string().url()),
    category: z.string(),
    featured: z.boolean(),
  })),
  aiSettings: z.object({
    provider: z.enum(['openai', 'flux', 'dalle', 'midjourney']),
    style: z.enum(['photorealistic', 'illustration', 'minimalist', 'modern', 'vintage']),
    quality: z.enum(['standard', 'hd', 'ultra']),
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']),
    colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
    excludeElements: z.array(z.string()),
    includeElements: z.array(z.string()),
  }),
  optimization: z.object({
    webp: z.boolean(),
    avif: z.boolean(),
    lazy: z.boolean(),
    blur: z.boolean(),
    compression: z.number().min(0).max(100),
    maxWidth: z.number(),
    maxHeight: z.number(),
    quality: z.number().min(0).max(100),
  }),
});

export type Images = z.infer<typeof ImagesSchema>;

// AI Image generation request schema
export const AIImageRequestSchema = z.object({
  prompt: z.string(),
  style: z.enum(['photorealistic', 'illustration', 'minimalist', 'modern', 'vintage']),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']),
  quality: z.enum(['standard', 'hd']),
  n: z.number().min(1).max(4),
  responseFormat: z.enum(['url', 'b64_json']),
});

export type AIImageRequest = z.infer<typeof AIImageRequestSchema>;

// AI Image generation response schema
export const AIImageResponseSchema = z.object({
  id: z.string(),
  object: z.literal('list'),
  created: z.number(),
  data: z.array(z.object({
    url: z.string().url().optional(),
    b64_json: z.string().optional(),
    revised_prompt: z.string().optional(),
  })),
});

export type AIImageResponse = z.infer<typeof AIImageResponseSchema>;
