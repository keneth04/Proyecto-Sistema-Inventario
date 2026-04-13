const { DatabaseHealth } = require('../database');

module.exports.HealthAPI = (app) => {
  app.get('/health/live', (_req, res) => {
    return res.status(200).json({
      status: 'ok',
      checks: {
        process: 'up'
      }
    });
  });

  app.get('/health/ready', async (_req, res) => {
    const database = await DatabaseHealth();
    const isHealthy = database.status === 'up';

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      checks: {
        database
      }
    });
  });
};