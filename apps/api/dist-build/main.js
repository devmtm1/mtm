"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const appCfg = configService.get('app');
    app.setGlobalPrefix('api');
    app.use((0, cookie_parser_1.default)());
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || appCfg.corsOrigin === '*') {
                callback(null, true);
                return;
            }
            const allowed = appCfg.corsOrigin.split(',').map((s) => s.trim());
            if (appCfg.nodeEnv !== 'production') {
                allowed.push('http://localhost:5173', 'http://127.0.0.1:5173');
            }
            if (allowed.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('MTM Immobilier — API')
        .setDescription('API backend de la plateforme MTM Immobilier — Phase 0 (socle technique)')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
    const swaggerDocument = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, swaggerDocument);
    await app.listen(appCfg.port, '0.0.0.0');
    console.log(`API démarrée sur http://localhost:${appCfg.port}/api`);
    console.log(`Swagger disponible sur http://localhost:${appCfg.port}/api/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map