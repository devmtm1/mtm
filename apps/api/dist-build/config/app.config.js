"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('app', () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? '3001', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
}));
//# sourceMappingURL=app.config.js.map