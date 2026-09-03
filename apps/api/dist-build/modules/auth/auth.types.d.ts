export interface AuthenticatedUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
    mustChangePassword: boolean;
    twoFactorEnabled: boolean;
}
export interface LoginResult {
    requiresTwoFactor: false;
    accessToken: string;
    user: AuthenticatedUser;
}
export interface TwoFactorRequiredResult {
    requiresTwoFactor: true;
    message: string;
}
export type LoginResponse = LoginResult | TwoFactorRequiredResult;
export interface JwtPayload {
    sub: string;
    email: string;
}
