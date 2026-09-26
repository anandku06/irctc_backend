const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const config = require('./config');

const connectionString = config.DATABASE_URL;

const globalForPrisma = global; // Using a global variable to store the Prisma client instance to avoid multiple instances in development mode

if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({
        connectionString,
    })

    globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: ['error', 'warn'], // Log all errors for debugging
    })
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;