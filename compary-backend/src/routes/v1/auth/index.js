import User from '../../../models/userModel.js';
import { authSchemas } from './schema.js';

export default async function authRoutes(fastify, options) {
  // Register JWT plugin only for auth routes
  fastify.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,
  });

  // ====== REGISTER ROUTE ======
  fastify.post('/register', { schema: authSchemas.register }, async (request, reply) => {
    const { username, email, password } = request.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return reply.status(409).send({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User with this email or username already exists.' }
      });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    const token = fastify.jwt.sign(
        { id: newUser._id, username: newUser.username },
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    reply.code(201).send({
      success: true,
      data: {
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
        },
      },
    });
  });

  // ====== LOGIN ROUTE ======
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      { id: user._id, username: user.username },
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
    );
    const refreshToken = fastify.jwt.sign(
      { id: user._id },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    user.refreshToken = refreshToken;
    await user.save();
    
    // Set refresh token in a secure, httpOnly cookie
    reply.setCookie('refreshToken', refreshToken, {
        path: '/',
        httpOnly: true, // Inaccessible to JavaScript
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict',
    });

    reply.code(200).send({
        success: true,
        data: {
          accessToken, // Send access token in the body
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
          },
        },
    });
  });

  // ====== REFRESH TOKEN ROUTE (NEW) ======
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.cookies;
    if (!refreshToken) {
        return reply.status(401).send({
            success: false,
            error: { code: 'REFRESH_TOKEN_MISSING', message: 'Refresh token is required.'}
        });
    }

    const newAccessToken = fastify.jwt.sign(
        { id: user._id, username: user.username, role: user.role }, // Add role
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
    );

    try {
        const decoded = fastify.jwt.verify(refreshToken);
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return reply.status(403).send({
                success: false,
                error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.'}
            });
        }
        
        const newAccessToken = fastify.jwt.sign(
            { id: user._id, username: user.username },
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
        );

        reply.send({
            success: true,
            data: {
                accessToken: newAccessToken
            }
        });

    } catch (err) {
        reply.status(403).send({
            success: false,
            error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.'}
        });
    }
  });
}

fastify.post('/logout', {
    preHandler: [fastify.authenticate] // User must be logged in to log out
  }, async (request, reply) => {
      const userId = request.user.id;
      
      // Invalidate the refresh token in the database
      await User.findByIdAndUpdate(userId, { refreshToken: null });

      // Clear the cookie on the client side
      reply.clearCookie('refreshToken', { path: '/' });
      
      reply.send({
          success: true,
          data: { message: 'Logged out successfully.'}
      });
  });


    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
        });
    }

    const token = fastify.jwt.sign(
        { id: user._id, username: user.username },
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    reply.code(200).send({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
          },
        },
    });
  
