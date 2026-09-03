"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProprietaireDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_proprietaire_dto_1 = require("./create-proprietaire.dto");
class UpdateProprietaireDto extends (0, swagger_1.PartialType)(create_proprietaire_dto_1.CreateProprietaireDto) {
}
exports.UpdateProprietaireDto = UpdateProprietaireDto;
//# sourceMappingURL=update-proprietaire.dto.js.map