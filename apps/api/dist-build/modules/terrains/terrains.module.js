"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerrainsModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const terrains_controller_1 = require("./terrains.controller");
const terrains_service_1 = require("./terrains.service");
const cloudinary_service_1 = require("../../common/storage/cloudinary.service");
const settings_module_1 = require("../settings/settings.module");
let TerrainsModule = class TerrainsModule {
};
exports.TerrainsModule = TerrainsModule;
exports.TerrainsModule = TerrainsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, settings_module_1.SettingsModule],
        controllers: [terrains_controller_1.TerrainsController],
        providers: [terrains_service_1.TerrainsService, cloudinary_service_1.CloudinaryService],
        exports: [terrains_service_1.TerrainsService],
    })
], TerrainsModule);
//# sourceMappingURL=terrains.module.js.map