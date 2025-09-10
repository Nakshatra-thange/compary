import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import dbConnector from './plugins/database.js';
import swaggerPlugin from './plugins/swagger.js';
import authRoutes from './routes/v1/auth/index.js';
import { ZodError } from 'zod';
import {AppError , ValidationError} from './utils/errors.js'
import authPlugin from './plugins/auth.js';
import userRoutes from './routes/v1/users/index.js'; // Import the new user routes
import cookie from '@fastify/cookie'
import adminRoutes   from './routes/v1/admin/index.js';
import passportPlugin from './plugins/passport.js'; // NEW
import mfaRoutes from './routes/v1/mfa/index.js';
import productRoutes from './routes/v1/products/index.js';
dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    // In development, use pino-pretty for human-readable logs
    // In production, it will automatically use structured JSON logs
    transport: process.env.NODE_ENV !== 'production' 
      ? { target: 'pino-pretty' } 
      : undefined,
  },
  // This automatically generates a unique requestId for each request
  genReqId: function (req) { return req.headers['x-request-id'] || crypto.randomUUID() },
});

// Register Core Plugins
fastify.register(cors, { origin: '*' }); // Configure for production later
fastify.register(dbConnector);
fastify.register(swaggerPlugin);
fastify.register(authPlugin);
fastify.register(cors,{
  origin:'http://localhost:3000',
  credentials: true
})
fastify.register(passportPlugin); 

// Register API Routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(userRoutes, { prefix: '/api/v1/users' });
fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
// Add other route plugins here later...
fastify.register(adminRoutes , {prefix:'/api/v1/admin'})
fastify.register(productRoutes, { prefix: '/api/v1/products' });
// fastify.register(productRoutes, { prefix: '/api/v1/products' });
fastify.register(cookie);
fastify.register(dbConnector)
// Global Error Handler
fastify.setErrorHandler((error, request, reply) => {
  // Log the error with request context
  request.log.error(error);

  if (error instanceof AppError) {
    // Handle our custom, operational errors
    const errorBody = {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
      }
    };
    if (error instanceof ValidationError && error.details) {
      errorBody.error.details = error.details;
    }
    reply.status(error.statusCode).send(errorBody);

  } else if (error instanceof ZodError) {
    // Handle Zod validation errors specifically
    reply.status(422).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The provided data was invalid.',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      },
    });

  } else {
    // Handle unexpected, non-operational errors
    // Send a generic message to the client to avoid leaking implementation details
    reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred on the server.',
      },
    });
  }
});


const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 5000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();