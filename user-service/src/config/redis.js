const Redis = require('ioredis');
const { config } = require('.');
const logger = require('./logger');

// Using Singleton pattern to ensure only one Redis client instance is created
class RedisClient {
    static instance;
    static isConnected = false;

    constructor() { } // prevents from direct instantiation
    // bcz using constructor directly will create a new instance every time, which we want to avoid.

    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new Redis(config.REDIS_URL, {
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }, // Retry strategy for reconnection attempts
                maxRetriesPerRequest: 3, // Limit the number of retries for a single request
            })

            RedisClient.setupEventListeners(); // this will setup the event listeners for the redis client instance
        }

        return RedisClient.instance;
    }

    static setupEventListeners() {
        RedisClient.instance.on('connect', () => {
            RedisClient.isConnected = true;
            logger.info('Connected to Redis');
        })

        RedisClient.instance.on('error', (err) => {
            RedisClient.isConnected = false;
            logger.error(`Redis error: ${err.message}`);
        })

        RedisClient.instance.on('close', () => {
            RedisClient.isConnected = false;
            logger.warn('Redis connection closed');
        })

        RedisClient.instance.on('reconnecting', () => {
            logger.warn('Reconnecting to Redis...');
        })

        RedisClient.instance.on('ready', () => {
            logger.warn('Redis connection is ready');
        })

        RedisClient.instance.on('end', () => {
            RedisClient.isConnected = false;
            logger.warn('Redis connection ended');
        })
    }

    static async closeConnection() {
        if (RedisClient.instance) {
            try {
                await RedisClient.instance.quit();
                logger.info('Redis connection closed gracefully');
            } catch (error) {
                logger.error(`Error closing Redis connection: ${error.message}`);
            }
        }
    }

    static isReady() {
        return RedisClient.isConnected;
    }

    static async ping() {
        try {
            await RedisClient.instance.ping();
            return true;
        } catch (error) {
            logger.error(`Error pinging Redis: ${error.message}`);
            return false;
        }
    }
}

module.exports = {
    redis: RedisClient.getInstance(),
    RedisClient
};