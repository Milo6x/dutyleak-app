import useSWR from 'swr'

const fetcher = async (url: string) => {
  console.log('Fetching dashboard data from:', url)
  
  try {
    const res = await fetch(url, {
      headers: {
        'Cache-Control': 'max-age=120', // 2 minutes cache
      },
    })
    
    console.log('Dashboard fetch response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Dashboard fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        error: errorText
      })
      throw new Error(`Failed to fetch dashboard data: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    console.log('Dashboard data fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Dashboard fetcher error:', error)
    throw error
  }
}

export function useDashboardData() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/stats',
    fetcher,
    {
      // Optimized SWR configuration for better performance
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Refetch on reconnect
      dedupingInterval: 120000, // 2 minutes deduplication
      errorRetryCount: 2, // Limit retry attempts
      errorRetryInterval: 5000, // 5 seconds between retries
      keepPreviousData: true, // Keep previous data while loading new data
      fallbackData: {
        overview: {
          totalProducts: 0,
          totalSavings: 0,
          pendingReviews: 0,
          activeJobs: 0
        },
        trends: {
          products: { change: 0 },
          savings: { change: 0 }
        },
        charts: {
          monthlySavings: [],
          productCategories: [],
          productMetrics: [],
          jobStatus: { recentJobs: [] }
        },
        lastUpdated: null
      }
    }
  )

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
    refreshData: mutate,
    isRefetching: isLoading
  }
}