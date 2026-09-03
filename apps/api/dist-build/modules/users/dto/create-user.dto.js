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
exports.CreateUserDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateUserDto {
    email;
    password;
    firstName;
    lastName;
    roleId;
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'commercial@mtm-immobilier.sn' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MotDePasseSecurise123!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(12, 200, {
        message: 'Le mot de passe doit contenir au moins 12 caractères',
    }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
        message: 'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial',
    }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fatou' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diop' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '8d7c6b5a-4e3f-2d1c-8b9a-887766554433' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "roleId", void 0);
//# sourceMappingURL=create-user.dto.js.map