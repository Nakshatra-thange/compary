import fastifyPlugin from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

async function swaggerGenerator(fastify, options) {
  fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Comparazon API',
        description: 'API documentation for the Comparazon platform.',
        version: '1.0.0',
      },
      host: `localhost:${process.env.PORT || 5000}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    },
  });

  fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  });
}

export default fastifyPlugin(swaggerGenerator);