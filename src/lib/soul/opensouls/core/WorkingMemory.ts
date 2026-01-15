/**
 * WorkingMemory - Immutable memory container for the Minoan Soul Engine
 *
 * Adapted from Open Souls functional programming paradigm.
 * All operations return new instances (copy-on-write immutability).
 */

import { ChatMessageRoleEnum } from './types';
import type {
  Memory,
  MemoryRegionConfig,
  WorkingMemoryConfig,
  WorkingMemorySnapshot,
} from './types';
import { getSoulLogger } from './SoulLogger';

export class WorkingMemory {
  readonly soulName: string;
  private readonly _memories: readonly Memory[];
  private readonly _regionalOrder: readonly string[];
  private readonly _regionConfigs: ReadonlyMap<string, MemoryRegionConfig>;

  constructor(config: WorkingMemoryConfig) {
    this.soulName = config.soulName;
    this._memories = Object.freeze(config.memories ?? []);
    this._regionalOrder = Object.freeze(config.regionalOrder ?? ['core', 'summary', 'default']);
    this._regionConfigs = new Map();
  }

  // Private constructor for immutable operations
  private static create(
    soulName: string,
    memories: readonly Memory[],
    regionalOrder: readonly string[],
    regionConfigs?: ReadonlyMap<string, MemoryRegionConfig>
  ): WorkingMemory {
    const wm = new WorkingMemory({ soulName, memories: [...memories], regionalOrder: [...regionalOrder] });
    if (regionConfigs) {
      (wm as any)._regionConfigs = regionConfigs;
    }
    return wm;
  }

  // ============================================
  // Memory Access
  // ============================================

  /**
   * Get all memories, ordered by region priority for LLM consumption
   */
  get memories(): readonly Memory[] {
    return this.getOrderedMemories();
  }

  /**
   * Get raw memories without region ordering
   */
  get rawMemories(): readonly Memory[] {
    return this._memories;
  }

  /**
   * Get the regional ordering
   */
  get regionalOrder(): readonly string[] {
    return this._regionalOrder;
  }

  /**
   * Get memories ordered by region priority
   */
  private getOrderedMemories(): readonly Memory[] {
    const regionBuckets = new Map<string, Memory[]>();

    // Initialize buckets for each region in order
    for (const region of this._regionalOrder) {
      regionBuckets.set(region, []);
    }
    regionBuckets.set('default', regionBuckets.get('default') ?? []);

    // Sort memories into buckets
    for (const memory of this._memories) {
      const region = memory.region ?? 'default';
      const bucket = regionBuckets.get(region);
      if (bucket) {
        bucket.push(memory);
      } else {
        // Unknown region goes to default
        regionBuckets.get('default')!.push(memory);
      }
    }

    // Flatten in order
    const ordered: Memory[] = [];
    for (const region of this._regionalOrder) {
      const bucket = regionBuckets.get(region);
      if (bucket) {
        ordered.push(...bucket);
      }
    }
    // Add any remaining default memories
    const defaultBucket = regionBuckets.get('default');
    if (defaultBucket && !this._regionalOrder.includes('default')) {
      ordered.push(...defaultBucket);
    }

    return Object.freeze(ordered);
  }

  /**
   * Get count of memories
   */
  get length(): number {
    return this._memories.length;
  }

  // ============================================
  // Immutable Operations - Adding Memories
  // ============================================

  /**
   * Add a memory and return a new WorkingMemory instance
   */
  withMemory(memory: Memory): WorkingMemory {
    const timestamped: Memory = {
      ...memory,
      timestamp: memory.timestamp ?? new Date().toISOString(),
    };
    const result = WorkingMemory.create(
      this.soulName,
      [...this._memories, timestamped],
      this._regionalOrder,
      this._regionConfigs
    );
    // Log the mutation
    getSoulLogger().memoryMutation('withMemory', this._memories.length, result.length);
    return result;
  }

  /**
   * Add multiple memories
   */
  withMemories(memories: Memory[]): WorkingMemory {
    const timestamped = memories.map(m => ({
      ...m,
      timestamp: m.timestamp ?? new Date().toISOString(),
    }));
    return WorkingMemory.create(
      this.soulName,
      [...this._memories, ...timestamped],
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Prepend a memory (add to beginning)
   */
  prepend(memory: Memory): WorkingMemory {
    const timestamped: Memory = {
      ...memory,
      timestamp: memory.timestamp ?? new Date().toISOString(),
    };
    return WorkingMemory.create(
      this.soulName,
      [timestamped, ...this._memories],
      this._regionalOrder,
      this._regionConfigs
    );
  }

  // ============================================
  // Immutable Operations - Regions
  // ============================================

  /**
   * Add or replace a memory region
   */
  withRegion(
    regionName: string,
    content: Memory | Memory[] | string,
    config?: MemoryRegionConfig
  ): WorkingMemory {
    // Remove existing memories in this region
    const filtered = this._memories.filter(m => m.region !== regionName);

    // Normalize content to Memory array
    let newMemories: Memory[];
    if (typeof content === 'string') {
      newMemories = [{
        role: ChatMessageRoleEnum.System,
        content,
        region: regionName,
        timestamp: new Date().toISOString(),
      }];
    } else if (Array.isArray(content)) {
      newMemories = content.map(m => ({ ...m, region: regionName }));
    } else {
      newMemories = [{ ...content, region: regionName }];
    }

    // Update region configs if provided
    const newConfigs = new Map(this._regionConfigs);
    if (config) {
      newConfigs.set(regionName, config);
    }

    // Ensure region is in the order
    let newOrder = this._regionalOrder;
    if (!this._regionalOrder.includes(regionName)) {
      newOrder = [...this._regionalOrder, regionName];
    }

    const result = WorkingMemory.create(
      this.soulName,
      [...filtered, ...newMemories],
      newOrder,
      newConfigs
    );
    // Log the mutation with region name
    getSoulLogger().memoryMutation('withRegion', this._memories.length, result.length, regionName);
    return result;
  }

  /**
   * Set the regional ordering for memory presentation
   */
  withRegionalOrder(...regions: string[]): WorkingMemory {
    return WorkingMemory.create(
      this.soulName,
      this._memories,
      regions,
      this._regionConfigs
    );
  }

  /**
   * Remove all memories from specified regions
   */
  withoutRegions(...regionNames: string[]): WorkingMemory {
    const filtered = this._memories.filter(
      m => !regionNames.includes(m.region ?? 'default')
    );
    return WorkingMemory.create(
      this.soulName,
      filtered,
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Keep only memories from specified regions
   */
  withOnlyRegions(...regionNames: string[]): WorkingMemory {
    const filtered = this._memories.filter(
      m => regionNames.includes(m.region ?? 'default')
    );
    return WorkingMemory.create(
      this.soulName,
      filtered,
      this._regionalOrder,
      this._regionConfigs
    );
  }

  // ============================================
  // Immutable Operations - List Operations
  // ============================================

  /**
   * Slice memories (like Array.slice)
   */
  slice(start?: number, end?: number): WorkingMemory {
    return WorkingMemory.create(
      this.soulName,
      this._memories.slice(start, end),
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Filter memories
   */
  filter(predicate: (memory: Memory, index: number) => boolean): WorkingMemory {
    return WorkingMemory.create(
      this.soulName,
      this._memories.filter(predicate),
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Map memories to new values
   */
  map(fn: (memory: Memory, index: number) => Memory): WorkingMemory {
    return WorkingMemory.create(
      this.soulName,
      this._memories.map(fn),
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Async map memories
   */
  async asyncMap(fn: (memory: Memory, index: number) => Promise<Memory>): Promise<WorkingMemory> {
    const mapped = await Promise.all(this._memories.map(fn));
    return WorkingMemory.create(
      this.soulName,
      mapped,
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Find a memory
   */
  find(predicate: (memory: Memory, index: number) => boolean): Memory | undefined {
    return this._memories.find(predicate);
  }

  /**
   * Check if any memory matches
   */
  some(predicate: (memory: Memory, index: number) => boolean): boolean {
    return this._memories.some(predicate);
  }

  /**
   * Get memory at index (supports negative indexing)
   */
  at(index: number): Memory | undefined {
    if (index < 0) {
      return this._memories[this._memories.length + index];
    }
    return this._memories[index];
  }

  /**
   * Replace memory at index
   */
  replace(index: number, memory: Memory): WorkingMemory {
    const actualIndex = index < 0 ? this._memories.length + index : index;
    if (actualIndex < 0 || actualIndex >= this._memories.length) {
      return this; // Index out of bounds, return unchanged
    }
    const newMemories = [...this._memories];
    newMemories[actualIndex] = {
      ...memory,
      timestamp: memory.timestamp ?? new Date().toISOString(),
    };
    return WorkingMemory.create(
      this.soulName,
      newMemories,
      this._regionalOrder,
      this._regionConfigs
    );
  }

  /**
   * Concatenate with another WorkingMemory or memories
   */
  concat(other: WorkingMemory | Memory[]): WorkingMemory {
    const otherMemories = other instanceof WorkingMemory ? other._memories : other;
    return WorkingMemory.create(
      this.soulName,
      [...this._memories, ...otherMemories],
      this._regionalOrder,
      this._regionConfigs
    );
  }

  // ============================================
  // Transformation (Open Souls Compatibility)
  // ============================================

  /**
   * Transform memory using a callback (Open Souls pattern)
   */
  transform(fn: (memories: readonly Memory[]) => Memory[]): WorkingMemory {
    return WorkingMemory.create(
      this.soulName,
      fn(this._memories),
      this._regionalOrder,
      this._regionConfigs
    );
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Export to snapshot for persistence
   */
  toSnapshot(): WorkingMemorySnapshot {
    return {
      soulName: this.soulName,
      memories: [...this._memories],
      regionalOrder: [...this._regionalOrder],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Restore from snapshot
   */
  static fromSnapshot(snapshot: WorkingMemorySnapshot): WorkingMemory {
    return new WorkingMemory({
      soulName: snapshot.soulName,
      memories: snapshot.memories,
      regionalOrder: snapshot.regionalOrder,
    });
  }

  /**
   * Convert to messages array for LLM API calls
   */
  toMessages(): Array<{ role: string; content: string; name?: string }> {
    return this.memories.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
    }));
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get memories by role
   */
  getByRole(role: ChatMessageRoleEnum): readonly Memory[] {
    return this._memories.filter(m => m.role === role);
  }

  /**
   * Get memories by region
   */
  getByRegion(region: string): readonly Memory[] {
    return this._memories.filter(m => (m.region ?? 'default') === region);
  }

  /**
   * Get the last N messages (useful for context windows)
   */
  getLastN(n: number): readonly Memory[] {
    return this._memories.slice(-n);
  }

  /**
   * Check if memory is empty
   */
  isEmpty(): boolean {
    return this._memories.length === 0;
  }

  /**
   * Clone with new soul name
   */
  withSoulName(soulName: string): WorkingMemory {
    return WorkingMemory.create(
      soulName,
      this._memories,
      this._regionalOrder,
      this._regionConfigs
    );
  }
}

export default WorkingMemory;
