'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'

import { DashboardLoader } from '@/components/ui/enhanced-loading'
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/breadcrumb'
import { GlobalSearch } from '@/components/ui/global-search'
import { KeyboardShortcuts } from '@/components/ui/keyboard-shortcuts'
import { MobileNav } from '@/components/ui/mobile-nav'
import {
  LayoutDashboard,
  Package,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  Building2,
  Users,
  CreditCard,
  FileText,
  Zap,
  CheckCircle,
  Calculator
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DashboardErrorBoundary } from '@/components/error/error-boundary'
import performanceOptimizer from '@/lib/performance/performance-optimizer'
import { handleError } from '@/lib/error/error-handler'
import { usePerformanceMonitoring, trackDashboardLoad, trackDashboardLoadComplete } from '@/lib/performance/dashboard-metrics'
// Temporarily comment out bundle optimizer import until module is created
// import { preloadRouteComponents } from '@/lib/performance/bundle-optimizer'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const router = useRouter()
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: pathname === '/dashboard' },
    { name: 'Products', href: '/products', icon: Package, current: pathname.startsWith('/products') },
    { name: 'Classification', href: '/classification', icon: FileText, current: pathname.startsWith('/classification') },
    { name: 'Landed Cost', href: '/landed-cost', icon: Calculator, current: pathname.startsWith('/landed-cost') },
    { name: 'Optimization', href: '/optimization', icon: Zap, current: pathname.startsWith('/optimization') },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, current: pathname.startsWith('/analytics') },
    { name: 'Review Queue', href: '/review-queue', icon: CheckCircle, current: pathname.startsWith('/review-queue') },
    { name: 'Scenarios', href: '/scenarios', icon: Building2, current: pathname.startsWith('/scenarios') },
    { name: 'Data Pipeline', href: '/data-pipeline', icon: Upload, current: pathname.startsWith('/data-pipeline') },
    { name: 'Settings', href: '/settings', icon: Settings, current: pathname.startsWith('/settings') },
  ]
  const supabase = createBrowserClient()

  // Initialize performance monitoring
  usePerformanceMonitoring('DashboardLayout')

  useEffect(() => {
    let isMounted = true;
    let subscription: any;

    // Fetch notifications from API instead of using mock data
    const fetchNotifications = async () => {
      if (!user || !isMounted) {return;}
      try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setNotifications(data.notifications || []);
            setUnreadCount(data.notifications?.filter((n: any) => !n.read).length || 0);
          }
        } else {
          // Fallback to empty notifications on error
          if (isMounted) {
            setNotifications([]);
            setUnreadCount(0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        // Fallback to empty notifications on error
        if (isMounted) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    const fetchData = async (userId: string) => {
      try {
        // Use performance optimizer for data fetching
        const [profileData, workspaceData] = await Promise.all([
          performanceOptimizer.optimizedQuery(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single(),
            {
              cacheKey: `profile_${userId}`,
              cacheTTL: 5 * 60 * 1000, // 5 minutes
              enableMetrics: true
            }
          ),
          performanceOptimizer.optimizedQuery(
            supabase
              .from('workspace_users')
              .select(`
                workspace_id,
                role,
                workspaces (
                  id,
                  name,
                  plan
                )
              `)
              .eq('user_id', userId)
              .single(),
            {
              cacheKey: `workspace_user_${userId}`,
              cacheTTL: 10 * 60 * 1000, // 10 minutes
              enableMetrics: true
            }
          )
        ])

        if (profileData && isMounted) {
          setProfile(profileData)
        }

        if ((workspaceData as any)?.data?.workspaces && isMounted) {
          setWorkspace((workspaceData as any).data.workspaces)
          
          // Preload critical data
          await performanceOptimizer.preloadCriticalData(
            userId,
            (workspaceData as any).data.workspaces.id
          )
        }
      } catch (error) {
        const appError = handleError(
          error as Error,
          {
            component: 'DashboardLayout',
            action: 'fetchData',
            userId
          },
          false // Don't show toast
        )
        
        console.error('Error fetching user data:', appError)
        if (isMounted) {
          setProfile(null)
          setWorkspace(null)
          setLoading(false)
        }
      }
    }

    const initializeAuth = async () => {
      if (!isMounted) {return;}
      
      const loadStartTime = trackDashboardLoad()
      
      try {
        // Set up auth state listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) {return;}

            // Only log auth changes in development mode
            if (process.env.NODE_ENV === 'development') {
              console.log('Auth state change:', event, !!session?.user)
            }
            
            if (event === 'SIGNED_OUT') {
              router.push('/auth/login')
            }
          }
        );
        
        subscription = authSubscription;

        // Check initial user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting user:', userError);
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setWorkspace(null)
            setLoading(false);
            router.push('/auth/login');
          }
          return;
        }

        if (user && isMounted) {
          setUser(user);
          try {
            await fetchData(user.id);
            await fetchNotifications(); // Fetch notifications for initial user
            if (isMounted) {
              setLoading(false);
              trackDashboardLoadComplete(false);
            }
          } catch (error) {
            console.error('Error fetching initial data:', error)
            if (isMounted) {
              setLoading(false);
              // Don't redirect on data fetch error, user is authenticated
            }
          }
        } else if (isMounted) {
          setLoading(false);
          router.push('/auth/login');
        }
      } catch (error) {
        const appError = handleError(
          error as Error,
          {
            component: 'DashboardLayout',
            action: 'initializeAuth',
            userId: user?.id || 'unknown'
          },
          false // Don't show toast, we'll redirect
        );
        
        console.error('Error in initializeAuth:', appError);
        if (isMounted) {
          setLoading(false);
          router.push('/auth/login');
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []) // Remove user?.id dependency to prevent infinite loop

  // Separate effect for pathname changes to handle route preloading
  useEffect(() => {
    if (user && !loading) {
      // Route preloading can be implemented here when needed
      // For now, we'll just ensure the user state is properly tracked
    }
  }, [pathname, user, loading]);

  // Generate breadcrumb items based on current path
  const generateBreadcrumbs = useCallback((): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Map path segments to readable labels
    const pathLabels: Record<string, string> = {
      'dashboard': 'Dashboard',
      'products': 'Products',
      'classification': 'Classification',
      'optimization': 'Optimization',
      'analytics': 'Analytics',
      'review-queue': 'Review Queue',
      'scenarios': 'Scenarios',
      'data-pipeline': 'Data Pipeline',
      'settings': 'Settings',
      'admin': 'Admin',
      'users': 'Users',
      'logs': 'Logs',
      'backup': 'Backup'
    }
    
    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === pathSegments.length - 1
      
      breadcrumbs.push({
        label: pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
        current: isLast
      })
    })
    
    return breadcrumbs
  }, [pathname])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  if (loading) {
    return <DashboardLoader />
  }

  return (
    <DashboardErrorBoundary>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-shrink-0 lg:w-64 bg-white dark:bg-gray-800 shadow-lg">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <img src="/logo.png" alt="DutyLeak Logo" className="h-8 w-auto" />
                <span className="text-xl font-semibold text-gray-800 dark:text-white">DutyLeak</span>
              </Link>

            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    item.current
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  )}

                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                    router.push('/auth/login');
                  } catch (error) {
                    console.error('Error signing out:', error);
                    toast.error('Failed to sign out');
                  }
                }}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:px-6">
            <MobileNav navigation={navigation} />
            <div className="flex-1 ml-4 lg:ml-0">
              <div className="w-full max-w-md">
                <GlobalSearch placeholder="Search products, classifications, etc..." />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Keyboard Shortcuts */}
              <KeyboardShortcuts />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <DropdownMenuLabel className="px-3 py-2">Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start p-2 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}
                        onSelect={() => !notification.read && handleMarkAsRead(notification.id)}
                      >
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>{notification.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{notification.time}</p>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      No new notifications.
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/notifications" className="flex items-center justify-center py-2 text-sm text-primary hover:bg-gray-100 dark:hover:bg-gray-700">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user?.email} />
                      <AvatarFallback>
                        {(profile?.full_name || user?.email || '')
                          .split(' ')
                          .map(word => word[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">
                      {profile?.full_name || user?.email}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{profile?.full_name || user?.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{workspace?.name} ({workspace?.plan})</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile" className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/billing" className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" /> Billing
                    </Link>
                  </DropdownMenuItem>
                  {workspace?.role === 'owner' && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings/team" className="flex items-center">
                        <Users className="mr-2 h-4 w-4" /> Manage Team
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                      router.push('/auth/login');
                    } catch (error) {
                      console.error('Error signing out:', error);
                      toast.error('Failed to sign out');
                    }
                  }} className="flex items-center text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-700/20">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Breadcrumb Navigation */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
              <Breadcrumb items={generateBreadcrumbs()} />
            </div>
            
            <div className="p-4 sm:p-6 lg:p-8">
              {loading ? <DashboardLoader /> : children}
            </div>
          </main>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}