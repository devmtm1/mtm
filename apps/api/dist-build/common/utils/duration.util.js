"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDurationToMs = parseDurationToMs;
function parseDurationToMs(duration) {
    const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
    if (!match) {
        throw new Error(`Format de durée invalide: "${duration}" (attendu ex: "15m", "7d")`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const unitToMs = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    return value * unitToMs[unit];
}
//# sourceMappingURL=duration.util.js.map