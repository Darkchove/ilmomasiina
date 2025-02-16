import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import fastify, { FastifyInstance } from 'fastify';
import cron from 'node-cron';
import path from 'path';

import AdminAuthSession from './authentication/adminAuthSession';
import config from './config';
import anonymizeOldSignups from './cron/anonymizeOldSignups';
import deleteOldAuditLogs from './cron/deleteOldAuditLogs';
import deleteUnconfirmedSignups from './cron/deleteUnconfirmedSignups';
import removeDeletedData from './cron/removeDeletedData';
import enforceHTTPS from './enforceHTTPS';
import setupDatabase from './models';
import setupRoutes from './routes';

export default async function initApp(): Promise<FastifyInstance> {
  await setupDatabase();

  const server = fastify({
    trustProxy: config.isAzure || config.trustProxy, // Get IPs from X-Forwarded-For
    logger: true, // Enable logger
  });

  // Register fastify-sensible (https://github.com/fastify/fastify-sensible)
  server.register(fastifySensible);

  // Enable configurable CORS
  if (config.allowOrigin) {
    const corsOrigins = config.allowOrigin === '*' ? '*' : (config.allowOrigin?.split(',') ?? []);
    await server.register(fastifyCors, {
      origin: corsOrigins,
    });
  }

  // Enforce HTTPS connections in production
  if (config.nodeEnv === 'production') {
    if (config.enforceHttps) {
      server.addHook('onRequest', enforceHTTPS(config));
      console.info(
        'Enforcing HTTPS connections.\n'
        + 'Ensure your load balancer or reverse proxy sets X-Forwarded-Proto (or X-ARR-SSL in Azure).',
      );
    } else {
      console.warn(
        'HTTPS connections are not enforced by Ilmomasiina.\n'
        + 'For security reasons, please set ENFORCE_HTTPS=proxy and configure your load balancer or reverse proxy to '
        + 'forward only HTTPS connections to Ilmomasiina.',
      );
    }
  }

  // Add on-the-fly compression
  server.register(fastifyCompress, { inflateIfDeflated: true });

  server.register(setupRoutes, {
    prefix: '/api',
    adminSession: new AdminAuthSession(config.feathersAuthSecret),
  });

  // Serving frontend files if frontendFilesPath is not null.
  // Ideally these files should be served by a web server and not the app server,
  // but this helps run a low-effort server.
  if (config.frontendFilesPath) {
    console.info(`Serving frontend files from '${config.frontendFilesPath}'`);
    server.register(fastifyStatic, {
      root: path.resolve(config.frontendFilesPath),
      preCompressed: true,
      wildcard: false, // Disable wildcard matching, so that own index.html is served
    });
    server.get('*', (_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  // Every minute, remove signups that haven't been confirmed fast enough
  cron.schedule('* * * * *', deleteUnconfirmedSignups);

  // Daily at 8am, anonymize old signups
  cron.schedule('0 8 * * *', anonymizeOldSignups);

  // Daily at 8am, delete deleted items from the database
  cron.schedule('0 8 * * *', removeDeletedData);

  // Daily at 8am, delete old audit logs
  cron.schedule('0 8 * * *', deleteOldAuditLogs);

  return server;
}
