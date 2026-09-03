export interface AppConfig {
    nodeEnv: string;
    port: number;
    corsOrigin: string;
}
declare const _default: (() => AppConfig) & import("@nestjs/config").ConfigFactoryKeyHost<AppConfig>;
export default _default;
