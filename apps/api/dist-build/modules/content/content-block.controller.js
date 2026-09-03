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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentBlockController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const content_block_service_1 = require("./content-block.service");
const create_content_block_dto_1 = require("./dto/create-content-block.dto");
const update_content_block_dto_1 = require("./dto/update-content-block.dto");
let ContentBlockController = class ContentBlockController {
    content;
    constructor(content) {
        this.content = content;
    }
    findAll(type) {
        if (type)
            return this.content.findByType(type);
        return this.content.findAll();
    }
    findByKey(key) {
        return this.content.findByKey(key);
    }
    create(dto, user) {
        return this.content.create(dto, user.id);
    }
    update(key, dto, user) {
        return this.content.update(key, dto, user.id);
    }
    remove(key) {
        return this.content.remove(key);
    }
};
exports.ContentBlockController = ContentBlockController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentBlockController.prototype, "findAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':key'),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentBlockController.prototype, "findByKey", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_content_block_dto_1.CreateContentBlockDto, Object]),
    __metadata("design:returntype", void 0)
], ContentBlockController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':key'),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:modifier'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_content_block_dto_1.UpdateContentBlockDto, Object]),
    __metadata("design:returntype", void 0)
], ContentBlockController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':key'),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:modifier'),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentBlockController.prototype, "remove", null);
exports.ContentBlockController = ContentBlockController = __decorate([
    (0, swagger_1.ApiTags)('content'),
    (0, common_1.Controller)('content'),
    __metadata("design:paramtypes", [content_block_service_1.ContentBlockService])
], ContentBlockController);
//# sourceMappingURL=content-block.controller.js.map