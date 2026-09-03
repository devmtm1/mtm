"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Erreur interne du serveur';
        let error;
        let code;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                const body = exceptionResponse;
                message = body.message ?? exception.message;
                error = body.error;
                code = body.code;
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(exception.message, exception.stack);
        }
        const body = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            ...(error ? { error } : {}),
            ...(code ? { code } : {}),
        };
        if (status >= 500) {
            this.logger.error(`${request.method} ${request.url} -> ${status}`, exception instanceof Error ? exception.stack : String(exception));
        }
        else {
            this.logger.warn(`${request.method} ${request.url} -> ${status}`);
        }
        response.status(status).json(body);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map