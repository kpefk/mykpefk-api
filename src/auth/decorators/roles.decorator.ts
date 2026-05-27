import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@prisma/client'

export const ROLES_KEY = 'roles'

/**
 * Decorator for setting role metadata.
 *
 * This decorator allows you to specify roles required for access to a method or class.
 *
 * @param roles - Array of roles to be set in the metadata.
 * @returns SetMetadata function that sets roles in the metadata.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
