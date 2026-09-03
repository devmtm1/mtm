import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export type UserWithRoles = User & {
    roles: {
        role: {
            name: string;
            permissions: {
                permission: {
                    name: string;
                };
            }[];
        };
    }[];
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<UserWithRoles | null>;
    findById(id: string): Promise<UserWithRoles | null>;
    getPermissionNames(user: UserWithRoles): string[];
    toAuthenticatedUser(user: UserWithRoles): {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        roles: string[];
        permissions: string[];
        mustChangePassword: boolean;
        twoFactorEnabled: boolean;
    };
    incrementFailedAttempts(userId: string): Promise<User>;
    resetFailedAttempts(userId: string): Promise<User>;
    lockAccount(userId: string, until: Date): Promise<User>;
    updateLastLogin(userId: string): Promise<User>;
    setTwoFactorSecret(userId: string, secret: string): Promise<User>;
    enableTwoFactor(userId: string): Promise<User>;
    disableTwoFactor(userId: string): Promise<User>;
    resetTwoFactor(userId: string): Promise<User>;
    changePassword(userId: string, hashedPassword: string): Promise<User>;
    create(dto: CreateUserDto): Promise<UserWithRoles>;
    findAll(): Promise<UserWithRoles[]>;
    update(userId: string, dto: UpdateUserDto): Promise<UserWithRoles>;
    remove(userId: string): Promise<void>;
    setActive(userId: string, isActive: boolean): Promise<User>;
    assignRole(userId: string, roleId: string): Promise<void>;
    removeRole(userId: string, roleId: string): Promise<void>;
}
