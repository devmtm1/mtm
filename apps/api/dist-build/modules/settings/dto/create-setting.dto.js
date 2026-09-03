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
exports.CreateSettingDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateSettingDto {
    key;
    value;
    description;
    isSensitive;
}
exports.CreateSettingDto = CreateSettingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'commission.taux_defaut' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 100),
    (0, class_validator_1.Matches)(/^[a-z0-9_.]+$/, {
        message: 'La clé doit être en minuscules, chiffres, underscores et points uniquement',
    }),
    __metadata("design:type", String)
], CreateSettingDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Valeur JSON quelconque (string, nombre, objet...)',
        example: 5,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], CreateSettingDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 255),
    __metadata("design:type", String)
], CreateSettingDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        default: false,
        description: 'Si vrai, requiert la permission settings:administrer (et non settings:modifier) pour être modifié ou consulté en clair',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSettingDto.prototype, "isSensitive", void 0);
//# sourceMappingURL=create-setting.dto.js.map