const { Kafka, logLevel } = require("kafkajs");
const logger = require("./logger");


const kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID,
    brokers: [config.KAFKA_BROKER || "localhost:9092"],
    logLevel: logLevel.ERROR,
    retry: {
        initialRetryTime: 300, // Initial time to wait before retrying a failed request
        retries: 8, // Number of retry attempts for failed requests
        maxRetryTime: 30000, // Maximum time to wait between retries, i.e. 30 seconds
    }
})

const producer = kafka.producer({
    allowAutoTopicCreation: true, // Allow automatic topic creation if the topic doesn't exist
    transactionTimeout: 30000, // Transaction timeout in milliseconds
    idempotent: true, // Enable idempotent producer to avoid duplicate messages
    maxInFlightRequests: 5, // Limit the number of in-flight requests to 5 for idempotent producer
    retry: {
        retries: 8, // Number of retry attempts for failed requests
    }
})

let isConnected = false;

const connectProducer = async () => {
    if (!isConnected) {
        await producer.connect();
        isConnected = true;
        logger.info("Kafka producer connected successfully");
    }
}

const disconnectProducer = async () => {
    if (isConnected) {
        await producer.disconnect();
        isConnected = false;
        logger.info("Kafka producer disconnected successfully");
    }
}

module.exports = {
    kafka,
    producer,
    connectProducer,
    disconnectProducer,
}