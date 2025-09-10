import fastifyPlugin from 'fastify-plugin';
import mongoose from 'mongoose';

async function dbConnector(fastify, options) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    fastify.log.info('MongoDB connected successfully.');
    fastify.decorate('mongoose', mongoose);
  } catch (err) {
    fastify.log.error(err, 'MongoDB connection error');
    process.exit(1);
  }
}

export default fastifyPlugin(dbConnector);