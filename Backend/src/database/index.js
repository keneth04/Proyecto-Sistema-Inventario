const { MongoClient } = require('mongodb');
const { Config } = require('../config');
const { Logger } = require('../common/logger');

let connection = null;
let client = null;
let indexesInitialized = false;

const CRITICAL_INDEXES = [
  {
    collection: 'users',
    key: { email: 1 },
    options: { name: 'uidx_users_email', unique: true }
  },
  {
    collection: 'users',
    key: { status: 1, createdAt: -1 },
    options: { name: 'idx_users_status_created_desc' }
  }
];

const getConnection = async () => {
  if (!connection) {
    client = new MongoClient(Config.mongoUri);
    await client.connect();
    connection = client.db(Config.mongoDbname);
    Logger.info('mongo_connected', {
      database: Config.mongoDbname
    });
  }

  return connection;
};

module.exports.Database = async (collection) => {
  try {
    const db = await getConnection();
    return db.collection(collection);
  } catch (error) {
    Logger.error('mongo_connection_failed', {
      collection,
      error: Logger.toErrorObject(error)
    });
    throw error;
  }
};

module.exports.ensureMongoIndexes = async () => {
  if (indexesInitialized) {
    return;
  }

  try {
    const db = await getConnection();

    for (const index of CRITICAL_INDEXES) {
      const collection = db.collection(index.collection);
      await collection.createIndex(index.key, index.options);
    }

    indexesInitialized = true;
    Logger.info('mongo_indexes_ensured', {
      totalIndexes: CRITICAL_INDEXES.length
    });
  } catch (error) {
    Logger.error('mongo_indexes_failed', {
      error: Logger.toErrorObject(error)
    });
    throw error;
  }
};


module.exports.DatabaseHealth = async () => {
  try {
    const db = await getConnection();
    await db.command({ ping: 1 });

    return {
      status: 'up'
    };
  } catch (error) {
    Logger.error('mongo_healthcheck_failed', {
      error: Logger.toErrorObject(error)
    });

    return {
      status: 'down',
      reason: error?.message || 'unknown_error'
    };
  }
};
