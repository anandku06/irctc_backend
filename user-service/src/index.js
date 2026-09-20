const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');


const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('User Service is running');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});


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