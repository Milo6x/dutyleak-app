import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Define date range presets
export type DateRangePreset = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

// Define date range type
export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

// Context interface
interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  isDateInRange: (date: Date) => boolean;
}

// Create context with default values
const DateRangeContext = createContext<DateRangeContextType>({
  dateRange: {
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    preset: 'today'
  },
  setDateRange: () => {},
  isDateInRange: () => false
});

// Helper functions for date calculations
const getToday = (): DateRange => {
  const today = new Date();
  return {
    startDate: new Date(today.setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    preset: 'today'
  };
};

const getYesterday = (): DateRange => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    startDate: new Date(yesterday.setHours(0, 0, 0, 0)),
    endDate: new Date(yesterday.setHours(23, 59, 59, 999)),
    preset: 'yesterday'
  };
};

const getLast7Days = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return {
    startDate: new Date(start.setHours(0, 0, 0, 0)),
    endDate: new Date(end.setHours(23, 59, 59, 999)),
    preset: 'last7days'
  };
};

const getLast30Days = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    startDate: new Date(start.setHours(0, 0, 0, 0)),
    endDate: new Date(end.setHours(23, 59, 59, 999)),
    preset: 'last30days'
  };
};

const getThisMonth = (): DateRange => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date();
  return {
    startDate: new Date(start.setHours(0, 0, 0, 0)),
    endDate: new Date(end.setHours(23, 59, 59, 999)),
    preset: 'thisMonth'
  };
};

const getLastMonth = (): DateRange => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    startDate: new Date(start.setHours(0, 0, 0, 0)),
    endDate: new Date(end.setHours(23, 59, 59, 999)),
    preset: 'lastMonth'
  };
};

// Get date range from preset
export const getDateRangeFromPreset = (preset: DateRangePreset): DateRange => {
  switch (preset) {
    case 'today':
      return getToday();
    case 'yesterday':
      return getYesterday();
    case 'last7days':
      return getLast7Days();
    case 'last30days':
      return getLast30Days();
    case 'thisMonth':
      return getThisMonth();
    case 'lastMonth':
      return getLastMonth();
    default:
      return getToday();
  }
};

// Format date for URL
const formatDateForUrl = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Parse date from URL
const parseDateFromUrl = (dateStr: string): Date => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
};

// Provider component
export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize state from URL or localStorage or default to today
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    // Try to get from URL first
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const presetParam = searchParams.get('preset') as DateRangePreset;
    
    if (startParam && endParam) {
      return {
        startDate: parseDateFromUrl(startParam),
        endDate: parseDateFromUrl(endParam),
        preset: presetParam || 'custom'
      };
    }
    
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const savedRange = localStorage.getItem('dateRange');
      if (savedRange) {
        try {
          const parsed = JSON.parse(savedRange);
          return {
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate),
            preset: parsed.preset
          };
        } catch (e) {
          console.error('Failed to parse saved date range:', e);
        }
      }
    }
    
    // Default to today
    return getToday();
  });
  
  // Update URL and localStorage when date range changes
  const setDateRange = (newRange: DateRange) => {
    setDateRangeState(newRange);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dateRange', JSON.stringify(newRange));
    }
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('start', formatDateForUrl(newRange.startDate));
    params.set('end', formatDateForUrl(newRange.endDate));
    params.set('preset', newRange.preset);
    
    router.replace(`${pathname}?${params.toString()}`);
  };
  
  // Check if a date is within the current range
  const isDateInRange = (date: Date): boolean => {
    return date >= dateRange.startDate && date <= dateRange.endDate;
  };
  
  // Provide context value
  const contextValue = {
    dateRange,
    setDateRange,
    isDateInRange
  };
  
  return (
    <DateRangeContext.Provider value={contextValue}>
      {children}
    </DateRangeContext.Provider>
  );
};

// Custom hook to use the date range context
export const useDateRange = () => useContext(DateRangeContext);
