import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_SECRET
  if (!key) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is required')
  }
  
  // Create a consistent 32-byte key from the secret
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

/**
 * Encrypts an API key for secure storage
 * @param apiKey - The plain text API key to encrypt
 * @returns Encrypted data as base64 string with format: iv:tag:encryptedData
 */
export function encryptApiKey(apiKey: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from('api-key-encryption', 'utf8'))
    
    let encrypted = cipher.update(apiKey, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    const tag = cipher.getAuthTag()
    
    // Combine iv, tag, and encrypted data
    const combined = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`
    return combined
  } catch (error) {
    console.error('Error encrypting API key:', error)
    throw new Error('Failed to encrypt API key')
  }
}

/**
 * Decrypts an API key from storage
 * @param encryptedData - The encrypted data string with format: iv:tag:encryptedData
 * @returns The decrypted API key
 */
export function decryptApiKey(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(parts[0], 'base64')
    const tag = Buffer.from(parts[1], 'base64')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAuthTag(tag)
    decipher.setAAD(Buffer.from('api-key-encryption', 'utf8'))
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Error decrypting API key:', error)
    throw new Error('Failed to decrypt API key')
  }
}

/**
 * Validates if an encrypted string can be decrypted
 * @param encryptedData - The encrypted data to validate
 * @returns True if the data can be decrypted, false otherwise
 */
export function validateEncryptedApiKey(encryptedData: string): boolean {
  try {
    decryptApiKey(encryptedData)
    return true
  } catch {
    return false
  }
}

/**
 * Masks an API key for display purposes
 * @param apiKey - The API key to mask
 * @param visibleChars - Number of characters to show at start and end
 * @returns Masked API key string
 */
export function maskApiKey(apiKey: string, visibleChars: number = 4): string {
  if (apiKey.length <= visibleChars * 2) {
    return '*'.repeat(apiKey.length)
  }
  
  const start = apiKey.substring(0, visibleChars)
  const end = apiKey.substring(apiKey.length - visibleChars)
  const middle = '*'.repeat(apiKey.length - (visibleChars * 2))
  
  return `${start}${middle}${end}`
}

/**
 * Generates a secure random API key for testing purposes
 * @param length - Length of the generated key
 * @returns Random API key string
 */
export function generateTestApiKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Validates API key format for different services
 * @param apiKey - The API key to validate
 * @param service - The service name (openai, anthropic, customs_api)
 * @returns Validation result with success and error message
 */
export function validateApiKeyFormat(apiKey: string, service: string): { valid: boolean; error?: string } {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' }
  }
  
  // Remove whitespace
  const trimmedKey = apiKey.trim()
  
  if (trimmedKey.length === 0) {
    return { valid: false, error: 'API key cannot be empty' }
  }
  
  // Service-specific validation
  switch (service.toLowerCase()) {
    case 'openai':
      if (!trimmedKey.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI API keys must start with "sk-"' }
      }
      if (trimmedKey.length < 20) {
        return { valid: false, error: 'OpenAI API key appears to be too short' }
      }
      break
      
    case 'anthropic':
      if (!trimmedKey.startsWith('sk-ant-')) {
        return { valid: false, error: 'Anthropic API keys must start with "sk-ant-"' }
      }
      if (trimmedKey.length < 30) {
        return { valid: false, error: 'Anthropic API key appears to be too short' }
      }
      break
      
    case 'customs_api':
      // Generic validation for customs API
      if (trimmedKey.length < 10) {
        return { valid: false, error: 'Customs API key appears to be too short' }
      }
      break
      
    default:
      // Generic validation
      if (trimmedKey.length < 8) {
        return { valid: false, error: 'API key appears to be too short' }
      }
  }
  
  return { valid: true }
}

/**
 * Securely compares two API keys to prevent timing attacks
 * @param a - First API key
 * @param b - Second API key
 * @returns True if keys match, false otherwise
 */
export function secureCompareApiKeys(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}