import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Schema for the user profile data
const userProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema for the full success response envelope
const userProfileResponseSchema = z.object({
  success: z.literal(true),
  data: userProfileSchema,
});

// Generate and export JSON schemas for Fastify
export const userSchemas = {
  getMe: {
    response: { 200: zodToJsonSchema(userProfileResponseSchema) },
    security: [{ apiKey: [] }] // This tells Swagger this route is protected
  }
};