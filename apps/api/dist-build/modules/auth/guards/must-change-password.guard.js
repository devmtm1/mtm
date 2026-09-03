"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MustChangePasswordGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const skip_password_check_decorator_1 = require("../decorators/skip-password-check.decorator");
let MustChangePasswordGuard = class MustChangePasswordGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const skip = this.reflector.getAllAndOverride(skip_password_check_decorator_1.SKIP_PASSWORD_CHECK_KEY, [context.getHandler(), context.getClass()]);
        if (skip)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (user?.mustChangePassword) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                code: 'PASSWORD_CHANGE_REQUIRED',
                message: 'Vous devez changer votre mot de passe avant de continuer.',
            });
        }
        return true;
    }
};
exports.MustChangePasswordGuard = MustChangePasswordGuard;
exports.MustChangePasswordGuard = MustChangePasswordGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], MustChangePasswordGuard);
//# sourceMappingURL=must-change-password.guard.js.map