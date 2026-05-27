import { applyDecorators, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'

import { AuthGuard } from '../guards/auth.guard'
import { RolesGuard } from '../guards/roles.guard'

import { Roles } from './roles.decorator'

/**
 * Decorator for authorizing users with specific roles.
 *
 * This decorator applies role-based protection and authentication.
 * If roles are specified, the Roles decorator is also applied.
 *
 * @param roles - Array of roles for which access is required.
 * @returns decorators to be applied to the method or class.
 */
export function Authorization(...roles: UserRole[]) {
	if (roles.length > 0) {
		return applyDecorators(
			Roles(...roles),
			UseGuards(AuthGuard, RolesGuard)
		)
	}

	return applyDecorators(UseGuards(AuthGuard))
}
