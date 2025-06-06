import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CacheManager } from '../cache-manager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  
  beforeEach(() => {
    // Create a new cache manager for each test
    cacheManager = new CacheManager();
    
    // Mock Date.now to control time
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });
  
  it('should store and retrieve values', async () => {
    await cacheManager.set('test-key', 'test-value');
    const value = await cacheManager.get('test-key');
    
    expect(value).toEqual('test-value');
  });
  
  it('should return null for non-existent keys', async () => {
    const value = await cacheManager.get('non-existent-key');
    
    expect(value).toBeNull();
  });
  
  it('should respect TTL and expire items', async () => {
    // Set item with 10 second TTL
    await cacheManager.set('expiring-key', 'expiring-value', 10);
    
    // Verify it exists initially
    let value = await cacheManager.get('expiring-key');
    expect(value).toEqual('expiring-value');
    
    // Advance time by 11 seconds (past TTL)
    jest.spyOn(Date, 'now').mockImplementation(() => 1000 + 11000);
    
    // Verify it's now expired
    value = await cacheManager.get('expiring-key');
    expect(value).toBeNull();
  });
  
  it('should delete items', async () => {
    // Set item
    await cacheManager.set('delete-key', 'delete-value');
    
    // Verify it exists
    let value = await cacheManager.get('delete-key');
    expect(value).toEqual('delete-value');
    
    // Delete it
    await cacheManager.delete('delete-key');
    
    // Verify it's gone
    value = await cacheManager.get('delete-key');
    expect(value).toBeNull();
  });
  
  it('should clear all items', async () => {
    // Set multiple items
    await cacheManager.set('key1', 'value1');
    await cacheManager.set('key2', 'value2');
    
    // Verify they exist
    expect(await cacheManager.get('key1')).toEqual('value1');
    expect(await cacheManager.get('key2')).toEqual('value2');
    
    // Clear all
    await cacheManager.clear();
    
    // Verify they're gone
    expect(await cacheManager.get('key1')).toBeNull();
    expect(await cacheManager.get('key2')).toBeNull();
  });
  
  it('should get or set values with getOrSet method', async () => {
    // Define a function that computes a value
    const computeFn = jest.fn<() => Promise<string>>().mockResolvedValue('computed-value');
    
    // First call should compute the value
    let value = await cacheManager.getOrSet('compute-key', computeFn);
    expect(value).toEqual('computed-value');
    expect(computeFn).toHaveBeenCalledTimes(1);
    
    // Second call should use cached value
    value = await cacheManager.getOrSet('compute-key', computeFn);
    expect(value).toEqual('computed-value');
    expect(computeFn).toHaveBeenCalledTimes(1); // Still only called once
    
    // Advance time past default TTL (1 hour)
    jest.spyOn(Date, 'now').mockImplementation(() => 1000 + 3601000);
    
    // Now it should compute again
    value = await cacheManager.getOrSet('compute-key', computeFn);
    expect(value).toEqual('computed-value');
    expect(computeFn).toHaveBeenCalledTimes(2);
  });
});
