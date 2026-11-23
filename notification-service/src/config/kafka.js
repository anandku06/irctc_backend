const { Kafka, logLevel } = require("kafkajs");
const { config } = require(".");
const logger = require("./logger");


const kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID,
    brokers: [config.KAFKA_BROKER || "localhost:9092"],
    logLevel: logLevel.ERROR,
    retry: {
        initialRetryTime: 300,
        retries: 10,
        maxRetryTime: 30000,
        multiplier: 2,
    }
})

const consumer = kafka.consumer({
    groupId: 'notification-service-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000, // used for consumer group management, to detect failures and trigger rebalancing
})

const shutdown = async () => {
    logger.info("Shutting down Kafka consumer...");
    await consumer.disconnect();

    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


module.exports = {
    kafka,
    consumer,
}