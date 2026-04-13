const express = require('express');

const { Config, validateCriticalConfig } = require('./src/config');
const { HorariosAPI } = require('./src/Horarios');
const { UsersAPI } = require('./src/users');
const { AuthAPI } = require('./src/auth');
const { ErrorMiddleware } = require('./src/middlewares/errorMiddleware');
const { SkillsAPI } = require('./src/skills');
const { SecurityMiddlewares } = require('./src/middlewares/securityMiddleware');
const { ensureMongoIndexes } = require('./src/database');
const { RequestContextMiddleware } = require('./src/middlewares/requestContextMiddleware');
const { Logger } = require('./src/common/logger');
const { ObservabilityMiddleware } = require('./src/middlewares/observabilityMiddleware');
const { ObservabilityAPI } = require('./src/observability');
const { HealthAPI } = require('./src/health');

const app = express();

validateCriticalConfig();

const securityMiddlewares = SecurityMiddlewares({
  allowedOrigins: Config.http.corsAllowedOrigins,
  jsonLimit: Config.http.jsonLimit,
  cspConnectSrc: Config.http.cspConnectSrc
});

app.use(RequestContextMiddleware);
app.use(securityMiddlewares.helmet);
app.use(securityMiddlewares.cors);
app.use(securityMiddlewares.jsonParser);
app.use(ObservabilityMiddleware);

HealthAPI(app);
ObservabilityAPI(app);
HorariosAPI(app);
UsersAPI(app);
AuthAPI(app);
SkillsAPI(app);

// 🔥 Middleware global de errores (SIEMPRE AL FINAL)
app.use(ErrorMiddleware);

const startServer = async () => {
  await ensureMongoIndexes();

  app.listen(Config.port, () => {
    Logger.info('server_started', {
      port: Number(Config.port),
      environment: process.env.NODE_ENV || 'development'
    });
  });
};

startServer().catch((error) => {
  Logger.error('server_startup_failed', {
    error: Logger.toErrorObject(error)
  });
  process.exit(1);
});
