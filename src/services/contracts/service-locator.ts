/**
 * Service Locator Pattern Implementation
 *
 * Provides a centralized registry for service access with proper typing.
 * This is an alternative to dependency injection for simpler use cases.
 */

import type {
  IAuctionService,
  IBidDepositService,
  IBuyerFeeService,
  ISellerPayoutService,
  IFraudService,
  INotificationService,
  IAuditService,
  IListingService,
  IEmailService,
  IStorageService,
} from './index'

// Import actual implementations
import * as AuctionService from '../auction.service'
import * as PaymentService from '../payment.service'
import * as FraudService from '../fraud.service'
import * as NotificationService from '../notification.service'
import * as AuditService from '../audit.service'
import * as ListingService from '../listing.service'
import * as EmailService from '@/lib/email'
import * as StorageService from '@/lib/r2'

/**
 * Service registry type
 */
type ServiceRegistry = {
  auction: IAuctionService
  bidDeposit: IBidDepositService
  buyerFee: IBuyerFeeService
  sellerPayout: ISellerPayoutService
  fraud: IFraudService
  notification: INotificationService
  audit: IAuditService
  listing: IListingService
  email: IEmailService
  storage: IStorageService
}

/**
 * Service Locator class
 * Singleton pattern for centralized service access
 */
class ServiceLocator {
  private static instance: ServiceLocator
  private registry: Map<keyof ServiceRegistry, unknown> = new Map()
  private overrides: Map<keyof ServiceRegistry, unknown> = new Map()

  private constructor() {
    this.initializeServices()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator()
    }
    return ServiceLocator.instance
  }

  /**
   * Initialize all services with default implementations
   */
  private initializeServices(): void {
    this.registry.set('auction', AuctionService)
    this.registry.set('bidDeposit', PaymentService)
    this.registry.set('buyerFee', PaymentService)
    this.registry.set('sellerPayout', PaymentService)
    this.registry.set('fraud', FraudService)
    this.registry.set('notification', NotificationService)
    this.registry.set('audit', AuditService)
    this.registry.set('listing', ListingService)
    this.registry.set('email', EmailService)
    this.registry.set('storage', StorageService)
  }

  /**
   * Get a service by name
   */
  get<K extends keyof ServiceRegistry>(serviceName: K): ServiceRegistry[K] {
    // Check for override first (useful for testing)
    if (this.overrides.has(serviceName)) {
      return this.overrides.get(serviceName) as ServiceRegistry[K]
    }

    const service = this.registry.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found in registry`)
    }

    return service as ServiceRegistry[K]
  }

  /**
   * Override a service (useful for testing)
   */
  override<K extends keyof ServiceRegistry>(
    serviceName: K,
    implementation: ServiceRegistry[K]
  ): void {
    this.overrides.set(serviceName, implementation)
  }

  /**
   * Clear all overrides (restore defaults)
   */
  clearOverrides(): void {
    this.overrides.clear()
  }

  /**
   * Clear a specific override
   */
  clearOverride(serviceName: keyof ServiceRegistry): void {
    this.overrides.delete(serviceName)
  }
}

/**
 * Convenience function to get services
 */
export function getService<K extends keyof ServiceRegistry>(
  serviceName: K
): ServiceRegistry[K] {
  return ServiceLocator.getInstance().get(serviceName)
}

/**
 * Convenience object with all services (lazy loaded)
 */
export const services = {
  get auction(): IAuctionService {
    return getService('auction')
  },
  get bidDeposit(): IBidDepositService {
    return getService('bidDeposit')
  },
  get buyerFee(): IBuyerFeeService {
    return getService('buyerFee')
  },
  get sellerPayout(): ISellerPayoutService {
    return getService('sellerPayout')
  },
  get fraud(): IFraudService {
    return getService('fraud')
  },
  get notification(): INotificationService {
    return getService('notification')
  },
  get audit(): IAuditService {
    return getService('audit')
  },
  get listing(): IListingService {
    return getService('listing')
  },
  get email(): IEmailService {
    return getService('email')
  },
  get storage(): IStorageService {
    return getService('storage')
  },
}

/**
 * Testing utilities
 */
export const testUtils = {
  /**
   * Override a service for testing
   */
  overrideService<K extends keyof ServiceRegistry>(
    serviceName: K,
    implementation: ServiceRegistry[K]
  ): void {
    ServiceLocator.getInstance().override(serviceName, implementation)
  },

  /**
   * Clear all service overrides
   */
  clearOverrides(): void {
    ServiceLocator.getInstance().clearOverrides()
  },

  /**
   * Clear a specific service override
   */
  clearOverride(serviceName: keyof ServiceRegistry): void {
    ServiceLocator.getInstance().clearOverride(serviceName)
  },
}

// Export the locator for advanced usage
export { ServiceLocator }
export type { ServiceRegistry }
