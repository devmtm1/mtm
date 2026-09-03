"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandatsModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const mandats_controller_1 = require("./mandats.controller");
const mandats_service_1 = require("./mandats.service");
const cloudinary_service_1 = require("../../common/storage/cloudinary.service");
const settings_module_1 = require("../settings/settings.module");
let MandatsModule = class MandatsModule {
};
exports.MandatsModule = MandatsModule;
exports.MandatsModule = MandatsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, settings_module_1.SettingsModule],
        controllers: [mandats_controller_1.MandatsController],
        providers: [mandats_service_1.MandatsService, cloudinary_service_1.CloudinaryService],
        exports: [mandats_service_1.MandatsService],
    })
], MandatsModule);
//# sourceMappingURL=mandats.module.js.map