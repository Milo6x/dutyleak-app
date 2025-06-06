'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { ClassificationHistory } from '@/components/classification/classification-history'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  ScaleIcon,
  RectangleStackIcon,
  TagIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Product {
  id: string
  title: string
  description: string | null
  sku?: string | null
  asin: string | null
  price?: number | null
  cost: number | null
  weight: number | null
  dimensions_height: number | null
  dimensions_length: number | null
  dimensions_width: number | null
  hs_code?: string | null
  country_of_origin?: string | null
  yearly_units?: number | null
  category: string | null
  subcategory: string | null
  created_at: string
  updated_at: string
  workspace_id: string
  active_classification_id?: string | null
}

interface Classification {
  id: string
  product_id: string
  hs6: string
  hs8?: string | null
  confidence_score: number
  source: string
  ruling_reference?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  classification_code?: string
  description?: string
  workspace_id?: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createBrowserClient()

  const productId = params.id as string

  useEffect(() => {
    if (productId) {
      fetchProduct()
      fetchClassifications()
    }
  }, [productId])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user's workspace
      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspaceUser) {
        setError('No workspace found')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('workspace_id', workspaceUser.workspace_id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Product not found')
        } else {
          throw error
        }
        return
      }

      setProduct(data as Product)
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const fetchClassifications = async () => {
    try {
      const { data } = await supabase
        .from('classifications')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      setClassifications(data || [])
    } catch (err) {
      console.error('Error fetching classifications:', err)
    }
  }

  const handleDelete = async () => {
    if (!product) {return}
    
    const confirmed = confirm(
      `Are you sure you want to delete "${product.title}"? This action cannot be undone.`
    )
    
    if (!confirmed) {return}

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) {throw error}

      toast.success('Product deleted successfully')
      router.push('/products')
    } catch (err) {
      console.error('Error deleting product:', err)
      toast.error('Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) {return 'N/A'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatWeight = (weight: number | null) => {
    if (weight === null) {return 'N/A'}
    return `${weight} lbs`
  }

  const formatDimensions = (length: number | null, width: number | null, height: number | null) => {
    if (!length && !width && !height) {return 'N/A'}
    const dims = [length, width, height].filter(d => d !== null)
    return dims.length > 0 ? `${dims.join(' × ')} in` : 'N/A'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getClassificationStatus = () => {
    if (classifications.length === 0) {return { status: 'none', color: 'gray' }}
    
    const latest = classifications[0]
    if (latest.is_active) {
      return { status: 'Classified', color: 'green' }
    } else {
      return { status: 'Needs Review', color: 'yellow' }
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
          <p className="text-gray-600 text-center max-w-md">
            {error || 'The product you are looking for does not exist or you do not have permission to view it.'}
          </p>
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const classificationStatus = getClassificationStatus()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/products">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Product ID: {product.id}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href={`/products/${productId}/edit`}>
              <Button variant="outline">
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CubeIcon className="h-5 w-5 mr-2" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="mt-1 text-gray-900">
                    {product.description || 'No description provided'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">SKU</Label>
                    <p className="mt-1 text-gray-900">{product.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ASIN</Label>
                    <p className="mt-1 text-gray-900">{product.asin || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Category</Label>
                    <p className="mt-1 text-gray-900">{product.category || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Subcategory</Label>
                    <p className="mt-1 text-gray-900">{product.subcategory || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Financial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Pricing & Financial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Price</Label>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Cost</Label>
                    <p className="mt-1 text-lg font-semibold text-blue-600">
                      {formatCurrency(product.cost)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Yearly Units</Label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {product.yearly_units?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Physical Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RectangleStackIcon className="h-5 w-5 mr-2" />
                  Physical Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Weight</Label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <ScaleIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatWeight(product.weight)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Dimensions (L × W × H)</Label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <CubeIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDimensions(product.dimensions_length, product.dimensions_width, product.dimensions_height)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CpuChipIcon className="h-5 w-5 mr-2" />
                  Classification History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClassificationHistory 
                  productId={productId} 
                  isOpen={true} 
                  onClose={() => {}} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Classification</span>
                  <Badge 
                    variant={classificationStatus.color === 'green' ? 'default' : 
                            classificationStatus.color === 'yellow' ? 'secondary' : 'destructive'}
                  >
                    {classificationStatus.status}
                  </Badge>
                </div>
                
                {product.hs_code && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">HS Code</Label>
                    <p className="mt-1 text-gray-900 font-mono">{product.hs_code}</p>
                  </div>
                )}
                
                {product.country_of_origin && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Country of Origin</Label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <GlobeAltIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {product.country_of_origin}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Created
                  </Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(product.created_at)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Last Updated
                  </Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(product.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <CpuChipIcon className="h-4 w-4 mr-2" />
                  Reclassify Product
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TagIcon className="h-4 w-4 mr-2" />
                  Update Category
                </Button>
                <Link href={`/products/${productId}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}