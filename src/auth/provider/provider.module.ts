import { DynamicModule, Module } from '@nestjs/common'

import {
	ProviderOptionsSymbol,
	TypeAsyncOptions,
	TypeOptions
} from './provider.constants'
import { ProviderService } from './provider.service'

/**
 * Module for managing OAuth providers.
 */
@Module({})
export class ProviderModule {
	/**
	 * Registers the provider module with synchronous options.
	 *
	 * @param options - Provider options containing the base URL and services.
	 * @returns Dynamic provider module.
	 */
	public static register(options: TypeOptions): DynamicModule {
		return {
			module: ProviderModule,
			providers: [
				{
					useValue: options,
					provide: ProviderOptionsSymbol
				},
				ProviderService
			],
			exports: [ProviderService]
		}
	}

	/**
	 * Registers the provider module with asynchronous options.
	 *
	 * @param options - Asynchronous provider options containing imports and factory functions.
	 * @returns Dynamic provider module.
	 */
	public static registerAsync(options: TypeAsyncOptions): DynamicModule {
		return {
			module: ProviderModule,
			imports: options.imports,
			providers: [
				{
					useFactory: options.useFactory,
					provide: ProviderOptionsSymbol,
					inject: options.inject
				},
				ProviderService
			],
			exports: [ProviderService]
		}
	}
}
