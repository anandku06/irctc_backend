const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const errorHandler = require('./middlewares/error.middleware');
const corsMiddleware = require('./middlewares/cors.middleware');
const logger = require('./config/logger');
const { config } = require('./config');
const reqLogger = require('./middlewares/req.middleware');


const app = express();

app.use(corsMiddleware); // Use the CORS middleware
app.use(helmet());
app.use(reqLogger); // Use the request logging middleware
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('User Service is running');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use(errorHandler); // Use the error handling middleware

const startServer = async () => {
    try {
        const server = app.listen(config.PORT, () => {
            logger.info(`${config.SERVICE_NAME} is running on port ${config.PORT}`);
        })
    } catch (error) {
        logger.error(`Error starting ${config.SERVICE_NAME}: ${error.message}`);
        process.exit(1);
    }
}