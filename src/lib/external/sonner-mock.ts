// Mock implementation of Sonner toast library
// This provides a fallback when the actual Sonner library is not available

const toast = {
  success: (message: string, options?: any) => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Success:', message, options);
    }
    
    // In production, you might want to show a native browser notification
    // or integrate with a different notification system
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Could implement browser notifications here
    }
    
    return { id: Math.random().toString() };
  },
  
  loading: (message: string, options?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('⏳ Loading:', message, options);
    }
    return { id: Math.random().toString() };
  },
  
  dismiss: (id?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Dismissing toast:', id);
    }
  },
  
  error: (message: string, options?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Error:', message, options);
    }
    return { id: Math.random().toString() };
  },
  
  info: (message: string, options?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.info('ℹ️ Info:', message, options);
    }
    return { id: Math.random().toString() };
  },
  
  warning: (message: string, options?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Warning:', message, options);
    }
    return { id: Math.random().toString() };
  }
};

export { toast };