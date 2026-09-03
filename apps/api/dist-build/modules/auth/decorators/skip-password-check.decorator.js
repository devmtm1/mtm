"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipPasswordCheck = exports.SKIP_PASSWORD_CHECK_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_PASSWORD_CHECK_KEY = 'skipPasswordCheck';
const SkipPasswordCheck = () => (0, common_1.SetMetadata)(exports.SKIP_PASSWORD_CHECK_KEY, true);
exports.SkipPasswordCheck = SkipPasswordCheck;
//# sourceMappingURL=skip-password-check.decorator.js.map