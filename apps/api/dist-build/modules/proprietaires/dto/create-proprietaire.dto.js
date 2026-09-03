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
exports.CreateProprietaireDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateProprietaireDto {
    firstName;
    lastName;
    email;
    phone;
    notes;
}
exports.CreateProprietaireDto = CreateProprietaireDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Aminata' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateProprietaireDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ndiaye' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateProprietaireDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'aminata.ndiaye@email.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Adresse e-mail invalide' }),
    __metadata("design:type", Object)
], CreateProprietaireDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '77 12 34 56 7' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 30),
    __metadata("design:type", Object)
], CreateProprietaireDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Propriétaire du lot 12' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 500),
    __metadata("design:type", Object)
], CreateProprietaireDto.prototype, "notes", void 0);
//# sourceMappingURL=create-proprietaire.dto.js.map