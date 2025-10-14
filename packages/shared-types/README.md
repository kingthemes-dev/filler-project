# @king/shared-types

Shared TypeScript types and Zod schemas for KING™ Headless Enterprise.

## Schemas

### TokensSchema
Design tokens for UI theming (colors, typography, spacing, etc.)

### ContentSchema
Content structure for pages and sections

### CatalogSchema
Product catalog with categories, attributes, and products

### SEOSchema
SEO metadata and structured data

### ImagesSchema
Image management and AI generation settings

### NewsletterSchema
Newsletter configuration and Brevo integration

## Usage

```typescript
import { TokensSchema, type Tokens } from '@king/shared-types';

// Validate data
const tokens = TokensSchema.parse(data);

// Type inference
const myTokens: Tokens = {
  colors: { /* ... */ },
  // ...
};
```

## Installation

```bash
pnpm add @king/shared-types
```
