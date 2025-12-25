// Base Repository - Generic repository interface and implementation
import { PrismaClient } from '@prisma/client'

/**
 * Generic repository interface for CRUD operations
 * Provides type-safe database access patterns
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>
  findMany(where: Record<string, unknown>): Promise<T[]>
  create(data: Record<string, unknown>): Promise<T>
  update(id: string, data: Record<string, unknown>): Promise<T>
  delete(id: string): Promise<T>
}

/**
 * Base repository implementation using Prisma
 * Provides common CRUD operations that can be extended by specific repositories
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(
    protected prisma: PrismaClient,
    protected modelName: string
  ) {}

  /**
   * Get the Prisma delegate for this model
   * Each extending repository must implement this to provide the correct model delegate
   */
  protected abstract getDelegate(): any

  async findById(id: string): Promise<T | null> {
    try {
      return await this.getDelegate().findUnique({
        where: { id },
      })
    } catch (error) {
      throw new Error(`Failed to find ${this.modelName} by id: ${error}`)
    }
  }

  async findMany(where: Record<string, unknown> = {}): Promise<T[]> {
    try {
      return await this.getDelegate().findMany({ where })
    } catch (error) {
      throw new Error(`Failed to find ${this.modelName} records: ${error}`)
    }
  }

  async create(data: Record<string, unknown>): Promise<T> {
    try {
      return await this.getDelegate().create({ data })
    } catch (error) {
      throw new Error(`Failed to create ${this.modelName}: ${error}`)
    }
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    try {
      return await this.getDelegate().update({
        where: { id },
        data,
      })
    } catch (error) {
      throw new Error(`Failed to update ${this.modelName}: ${error}`)
    }
  }

  async delete(id: string): Promise<T> {
    try {
      return await this.getDelegate().delete({
        where: { id },
      })
    } catch (error) {
      throw new Error(`Failed to delete ${this.modelName}: ${error}`)
    }
  }

  /**
   * Count records matching a condition
   */
  async count(where: Record<string, unknown> = {}): Promise<number> {
    try {
      return await this.getDelegate().count({ where })
    } catch (error) {
      throw new Error(`Failed to count ${this.modelName} records: ${error}`)
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.count({ id })
    return count > 0
  }

  /**
   * Find first record matching condition
   */
  async findFirst(where: Record<string, unknown>): Promise<T | null> {
    try {
      return await this.getDelegate().findFirst({ where })
    } catch (error) {
      throw new Error(`Failed to find first ${this.modelName}: ${error}`)
    }
  }

  /**
   * Update many records matching condition
   */
  async updateMany(
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<{ count: number }> {
    try {
      return await this.getDelegate().updateMany({ where, data })
    } catch (error) {
      throw new Error(`Failed to update many ${this.modelName} records: ${error}`)
    }
  }
}
