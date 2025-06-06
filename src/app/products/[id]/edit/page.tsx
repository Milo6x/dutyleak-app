'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
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
  workspace_id: string
  active_classification_id?: string | null
  created_at?: string
}

interface FormData {
  title: string
  description: string
  sku: string
  asin: string
  price: string
  cost: string
  weight: string
  dimensions_height: string
  dimensions_length: string
  dimensions_width: string
  hs_code: string
  country_of_origin: string
  yearly_units: string
  category: string
  subcategory: string
}

const CATEGORIES = [
  'Electronics',
  'Clothing & Accessories',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Health & Beauty',
  'Toys & Games',
  'Automotive',
  'Industrial & Scientific',
  'Food & Beverages',
  'Other'
]

const COUNTRIES = [
  'United States',
  'China',
  'Germany',
  'Japan',
  'United Kingdom',
  'France',
  'Italy',
  'Canada',
  'South Korea',
  'Mexico',
  'India',
  'Brazil',
  'Other'
]

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    sku: '',
    asin: '',
    price: '',
    cost: '',
    weight: '',
    dimensions_height: '',
    dimensions_length: '',
    dimensions_width: '',
    hs_code: '',
    country_of_origin: '',
    yearly_units: '',
    category: '',
    subcategory: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const productId = params.id as string

  useEffect(() => {
    if (productId) {
      fetchProduct()
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
      
      // Populate form with existing data
      setFormData({
        title: data.title || '',
        description: data.description || '',
        sku: (data as any).sku || '',
        asin: data.asin || '',
        price: (data as any).price?.toString() || '',
        cost: data.cost?.toString() || '',
        weight: data.weight?.toString() || '',
        dimensions_height: data.dimensions_height?.toString() || '',
        dimensions_length: data.dimensions_length?.toString() || '',
        dimensions_width: data.dimensions_width?.toString() || '',
        hs_code: (data as any).hs_code || '',
        country_of_origin: (data as any).country_of_origin || '',
        yearly_units: (data as any).yearly_units?.toString() || '',
        category: data.category || '',
        subcategory: data.subcategory || ''
      })
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Product title is required')
      return
    }

    try {
      setSaving(true)
      
      // Convert string values to appropriate types
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        asin: formData.asin.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions_height: formData.dimensions_height ? parseFloat(formData.dimensions_height) : null,
        dimensions_length: formData.dimensions_length ? parseFloat(formData.dimensions_length) : null,
        dimensions_width: formData.dimensions_width ? parseFloat(formData.dimensions_width) : null,
        hs_code: formData.hs_code.trim() || null,
        country_of_origin: formData.country_of_origin || null,
        yearly_units: formData.yearly_units ? parseInt(formData.yearly_units) : null,
        category: formData.category || null,
        subcategory: formData.subcategory.trim() || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)

      if (error) {throw error}

      toast.success('Product updated successfully')
      router.push(`/products/${productId}`)
    } catch (err) {
      console.error('Error updating product:', err)
      toast.error('Failed to update product')
    } finally {
      setSaving(false)
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
          <p className="text-gray-600 text-center max-w-md">
            {error || 'The product you are trying to edit does not exist or you do not have permission to edit it.'}
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/products/${productId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-sm text-gray-500 mt-1">
                {product.title}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href={`/products/${productId}`}>
              <Button variant="outline">
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button 
              onClick={handleSubmit}
              disabled={saving}
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Product Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter product title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Product SKU"
                    />
                  </div>
                  <div>
                    <Label htmlFor="asin">ASIN</Label>
                    <Input
                      id="asin"
                      value={formData.asin}
                      onChange={(e) => handleInputChange('asin', e.target.value)}
                      placeholder="Amazon ASIN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Input
                      id="subcategory"
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      placeholder="Enter subcategory"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Financial */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Financial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => handleInputChange('cost', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="yearly_units">Yearly Units</Label>
                  <Input
                    id="yearly_units"
                    type="number"
                    min="0"
                    value={formData.yearly_units}
                    onChange={(e) => handleInputChange('yearly_units', e.target.value)}
                    placeholder="Annual sales volume"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Physical Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Physical Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label>Dimensions (inches)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dimensions_length}
                      onChange={(e) => handleInputChange('dimensions_length', e.target.value)}
                      placeholder="Length"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dimensions_width}
                      onChange={(e) => handleInputChange('dimensions_width', e.target.value)}
                      placeholder="Width"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dimensions_height}
                      onChange={(e) => handleInputChange('dimensions_height', e.target.value)}
                      placeholder="Height"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade & Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Trade & Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="hs_code">HS Code</Label>
                  <Input
                    id="hs_code"
                    value={formData.hs_code}
                    onChange={(e) => handleInputChange('hs_code', e.target.value)}
                    placeholder="Harmonized System Code"
                  />
                </div>
                
                <div>
                  <Label htmlFor="country_of_origin">Country of Origin</Label>
                  <Select value={formData.country_of_origin} onValueChange={(value) => handleInputChange('country_of_origin', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}