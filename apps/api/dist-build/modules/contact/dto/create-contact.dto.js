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
exports.CreateContactDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateContactDto {
    nom;
    email;
    telephone;
    sujet;
    message;
    terrainId;
}
exports.CreateContactDto = CreateContactDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fatou Diop' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 200),
    __metadata("design:type", String)
], CreateContactDto.prototype, "nom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'fatou@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateContactDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+221 77 000 00 00', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(4, 30),
    __metadata("design:type", String)
], CreateContactDto.prototype, "telephone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Acquérir un terrain',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 100),
    __metadata("design:type", String)
], CreateContactDto.prototype, "sujet", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Je suis intéressé(e) par le terrain MTM-TH-024...' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(10, 2000),
    __metadata("design:type", String)
], CreateContactDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'a1b2c3d4-...', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateContactDto.prototype, "terrainId", void 0);
//# sourceMappingURL=create-contact.dto.js.map