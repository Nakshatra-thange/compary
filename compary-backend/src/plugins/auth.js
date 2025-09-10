import fastifyPlugin from 'fastify-plugin';
import jwt from '@fastify/jwt';
import User from '../models/userModel.js'; // NEW: Import User model

async function authPlugin(fastify, options) {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
  });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }
  });

  // NEW: Create an authorization decorator that checks for specific roles
  fastify.decorate('authorize', (allowedRoles) => {
    return async function (request, reply) {
      // The payload from the verified JWT is on request.user
      const userRole = request.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        reply.code(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action.',
          },
        });
      }
    };
  });
}

export default fastifyPlugin(authPlugin);