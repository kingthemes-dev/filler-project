import { z } from 'zod';

// Content schema for pages and sections
export const ContentSchema = z.object({
  pages: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    content: z.array(z.object({
      type: z.enum(['hero', 'features', 'testimonials', 'cta', 'text', 'image', 'gallery', 'form']),
      data: z.record(z.any()),
    })),
    published: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['header', 'footer', 'sidebar', 'newsletter', 'contact']),
    content: z.record(z.any()),
    active: z.boolean(),
  })),
  translations: z.record(z.object({
    title: z.string(),
    description: z.string(),
    content: z.string(),
  })),
  language: z.enum(['pl', 'en', 'de', 'es']),
  tone: z.enum(['professional', 'casual', 'friendly', 'authoritative', 'creative']),
  style: z.enum(['modern', 'classic', 'minimal', 'bold', 'elegant']),
});

export type Content = z.infer<typeof ContentSchema>;

// Specific page schemas
export const HomePageSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
    ctaText: z.string(),
    ctaLink: z.string(),
    backgroundImage: z.string().url().optional(),
  }),
  features: z.array(z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
  })),
  testimonials: z.array(z.object({
    name: z.string(),
    company: z.string(),
    text: z.string(),
    rating: z.number().min(1).max(5),
    avatar: z.string().url().optional(),
  })),
  cta: z.object({
    title: z.string(),
    description: z.string(),
    buttonText: z.string(),
    buttonLink: z.string(),
  }),
});

export const AboutPageSchema = z.object({
  title: z.string(),
  content: z.string(),
  team: z.array(z.object({
    name: z.string(),
    position: z.string(),
    bio: z.string(),
    photo: z.string().url().optional(),
  })).optional(),
  values: z.array(z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
  })).optional(),
});

export const ContactPageSchema = z.object({
  title: z.string(),
  description: z.string(),
  contactInfo: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  form: z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'email', 'textarea', 'select']),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })),
  }),
});

export type HomePage = z.infer<typeof HomePageSchema>;
export type AboutPage = z.infer<typeof AboutPageSchema>;
export type ContactPage = z.infer<typeof ContactPageSchema>;
