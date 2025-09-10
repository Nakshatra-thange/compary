import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const registerBodySchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export const loginBodySchema = z.object({
    email: z.string().email("Invalid email address."),
    password: z.string(),
});

// Schema for successful authentication response
const authSuccessResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        token: z.string(),
        user: z.object({
            id: z.string(),
            username: z.string(),
            email: z.string().email(),
        })
    })
});

// Generate JSON schemas for Fastify
export const authSchemas = {
  register: {
    body: zodToJsonSchema(registerBodySchema, "registerBodySchema"),
    response: { 201: zodToJsonSchema(authSuccessResponseSchema) }
  },
  login: {
    body: zodToJsonSchema(loginBodySchema, "loginBodySchema"),
    response: { 200: zodToJsonSchema(authSuccessResponseSchema) }
  }
};