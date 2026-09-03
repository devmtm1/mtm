"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipTwoFactorRequirement = exports.SKIP_TWO_FACTOR_REQUIREMENT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_TWO_FACTOR_REQUIREMENT_KEY = 'skipTwoFactorRequirement';
const SkipTwoFactorRequirement = () => (0, common_1.SetMetadata)(exports.SKIP_TWO_FACTOR_REQUIREMENT_KEY, true);
exports.SkipTwoFactorRequirement = SkipTwoFactorRequirement;
//# sourceMappingURL=skip-two-factor-requirement.decorator.js.map