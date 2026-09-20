

const reqLogger = (req, res, next) => {
    logger.debug(`Incoming request: ${req.method} ${req.url}`);
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(
            `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
        );
    })

    next();
}