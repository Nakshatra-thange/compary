import User from '../../../models/userModel.js';
import { userSchemas } from './schema.js';

export default async function userRoutes(fastify, options) {

  // ====== GET CURRENT USER PROFILE ======
  fastify.get('/me', {
    // This is the magic! It runs our 'authenticate' function first.
    preHandler: [fastify.authenticate],
    schema: userSchemas.getMe
  }, async (request, reply) => {
    
    // If we reach here, the user is authenticated.
    // The decoded JWT payload is available on request.user
    const userId = request.user.id;

    // We select '-password' to explicitly exclude the password field
    const user = await User.findById(userId).select('-password');

    if (!user) {
        return reply.status(404).send({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found.'}
        });
    }

    // Send the standardized success response
    reply.code(200).send({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });
}