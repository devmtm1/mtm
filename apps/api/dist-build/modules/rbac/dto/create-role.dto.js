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
exports.CreateRoleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateRoleDto {
    name;
    description;
}
exports.CreateRoleDto = CreateRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'responsable_marketing' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 50),
    (0, class_validator_1.Matches)(/^[a-z0-9_]+$/, {
        message: 'Le nom du rôle doit être en minuscules, chiffres et underscores uniquement',
    }),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'Responsable marketing' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 255),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "description", void 0);
//# sourceMappingURL=create-role.dto.js.map