import { ConfigService } from '@nestjs/config'
import * as dotenv from 'dotenv'

// Loads environment variables from .env file
dotenv.config()

/**
 * Checks if the application is in development mode.
 * @param configService - Configuration service.
 * @returns true if in development mode; otherwise false.
 */
export const isDev = (configService: ConfigService): boolean =>
	configService.getOrThrow('NODE_ENV') === 'development'

/**
 * Determines if the application is running in development mode.
 */
export const IS_DEV_ENV = process.env.NODE_ENV === 'development'
