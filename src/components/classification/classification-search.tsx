'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Target,
  AlertTriangle,
  Clock,
  User,
  Globe,
  Package,
  Zap,
  SortAsc,
  SortDesc,
  RotateCcw,
  Download,
  BookmarkPlus
} from 'lucide-react'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'

interface ClassificationItem {
  id: string
  hsCode: string
  productName: string
  productDescription: string
  category: string
  confidence: number
  source: 'ai' | 'manual' | 'historical' | 'expert'
  timestamp: string
  originCountry?: string
  destinationCountry?: string
  riskLevel: 'low' | 'medium' | 'high'
  tags: string[]
  userId?: string
  companyId?: string
  validationStatus: 'pending' | 'validated' | 'rejected'
  complianceFlags: string[]
  alternativeCodes?: string[]
  imageAnalysis?: boolean
  expertReview?: boolean
}

interface SearchFilters {
  query: string
  hsCodePattern: string
  categories: string[]
  sources: string[]
  confidenceRange: [number, number]
  riskLevels: string[]
  validationStatuses: string[]
  dateRange?: DateRange
  countries: string[]
  tags: string[]
  complianceFlags: string[]
  hasImageAnalysis?: boolean
  hasExpertReview?: boolean
  minAlternatives?: number
}

interface SortConfig {
  field: keyof ClassificationItem | 'relevance'
  direction: 'asc' | 'desc'
}

interface ClassificationSearchProps {
  data: ClassificationItem[]
  onResultsChange?: (results: ClassificationItem[]) => void
  onSelectionChange?: (selected: string[]) => void
  showBulkActions?: boolean
  savedSearches?: { name: string; filters: SearchFilters }[]
  onSaveSearch?: (name: string, filters: SearchFilters) => void
}

const defaultFilters: SearchFilters = {
  query: '',
  hsCodePattern: '',
  categories: [],
  sources: [],
  confidenceRange: [0, 100],
  riskLevels: [],
  validationStatuses: [],
  countries: [],
  tags: [],
  complianceFlags: []
}

const sourceOptions = [
  { value: 'ai', label: 'AI Classification', color: 'bg-blue-100 text-blue-800' },
  { value: 'manual', label: 'Manual Entry', color: 'bg-green-100 text-green-800' },
  { value: 'historical', label: 'Historical Data', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'expert', label: 'Expert Review', color: 'bg-purple-100 text-purple-800' }
]

const riskOptions = [
  { value: 'low', label: 'Low Risk', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High Risk', color: 'bg-red-100 text-red-800' }
]

const validationOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'validated', label: 'Validated', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' }
]

export default function ClassificationSearch({
  data,
  onResultsChange,
  onSelectionChange,
  showBulkActions = false,
  savedSearches = [],
  onSaveSearch
}: ClassificationSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'timestamp', direction: 'desc' })
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const categories = [...new Set(data.map(item => item.category))].sort()
    const countries = [...new Set([
      ...data.map(item => item.originCountry).filter(Boolean),
      ...data.map(item => item.destinationCountry).filter(Boolean)
    ])].sort()
    const tags = [...new Set(data.flatMap(item => item.tags))].sort()
    const complianceFlags = [...new Set(data.flatMap(item => item.complianceFlags))].sort()
    
    return { categories, countries, tags, complianceFlags }
  }, [data])

  // Filter and sort data
  const filteredData = useMemo(() => {
    const results = data.filter(item => {
      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase()
        const searchableText = [
          item.hsCode,
          item.productName,
          item.productDescription,
          item.category,
          ...item.tags
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(query)) {return false}
      }

      // HS Code pattern
      if (filters.hsCodePattern) {
        const pattern = new RegExp(filters.hsCodePattern.replace(/\*/g, '.*'), 'i')
        if (!pattern.test(item.hsCode)) {return false}
      }

      // Categories
      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) {
        return false
      }

      // Sources
      if (filters.sources.length > 0 && !filters.sources.includes(item.source)) {
        return false
      }

      // Confidence range
      if (item.confidence < filters.confidenceRange[0] || item.confidence > filters.confidenceRange[1]) {
        return false
      }

      // Risk levels
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(item.riskLevel)) {
        return false
      }

      // Validation statuses
      if (filters.validationStatuses.length > 0 && !filters.validationStatuses.includes(item.validationStatus)) {
        return false
      }

      // Date range
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const itemDate = new Date(item.timestamp)
        if (filters.dateRange.from && itemDate < filters.dateRange.from) {return false}
        if (filters.dateRange.to && itemDate > filters.dateRange.to) {return false}
      }

      // Countries
      if (filters.countries.length > 0) {
        const itemCountries = [item.originCountry, item.destinationCountry].filter(Boolean)
        if (!filters.countries.some(country => itemCountries.includes(country))) {
          return false
        }
      }

      // Tags
      if (filters.tags.length > 0) {
        if (!filters.tags.some(tag => item.tags.includes(tag))) {
          return false
        }
      }

      // Compliance flags
      if (filters.complianceFlags.length > 0) {
        if (!filters.complianceFlags.some(flag => item.complianceFlags.includes(flag))) {
          return false
        }
      }

      // Image analysis
      if (filters.hasImageAnalysis !== undefined && item.imageAnalysis !== filters.hasImageAnalysis) {
        return false
      }

      // Expert review
      if (filters.hasExpertReview !== undefined && item.expertReview !== filters.hasExpertReview) {
        return false
      }

      // Minimum alternatives
      if (filters.minAlternatives !== undefined) {
        const altCount = item.alternativeCodes?.length || 0
        if (altCount < filters.minAlternatives) {return false}
      }

      return true
    })

    // Sort results
    results.sort((a, b) => {
      let aValue: any
      let bValue: any

      if (sortConfig.field === 'relevance') {
        // Simple relevance scoring based on query match
        const getRelevanceScore = (item: ClassificationItem) => {
          if (!filters.query) {return 0}
          const query = filters.query.toLowerCase()
          let score = 0
          if (item.hsCode.toLowerCase().includes(query)) {score += 10}
          if (item.productName.toLowerCase().includes(query)) {score += 8}
          if (item.category.toLowerCase().includes(query)) {score += 5}
          if (item.productDescription.toLowerCase().includes(query)) {score += 3}
          return score
        }
        aValue = getRelevanceScore(a)
        bValue = getRelevanceScore(b)
      } else {
        aValue = a[sortConfig.field]
        bValue = b[sortConfig.field]
      }

      if (aValue < bValue) {return sortConfig.direction === 'asc' ? -1 : 1}
      if (aValue > bValue) {return sortConfig.direction === 'asc' ? 1 : -1}
      return 0
    })

    return results
  }, [data, filters, sortConfig])

  // Update results when filtered data changes
  React.useEffect(() => {
    onResultsChange?.(filteredData)
  }, [filteredData, onResultsChange])

  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleArrayFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: string
  ) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setSelectedItems([])
  }, [])

  const handleSort = useCallback((field: keyof ClassificationItem | 'relevance') => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSelection = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
      onSelectionChange?.(newSelection)
      return newSelection
    })
  }, [onSelectionChange])

  const handleSelectAll = useCallback(() => {
    const allIds = filteredData.map(item => item.id)
    const newSelection = selectedItems.length === allIds.length ? [] : allIds
    setSelectedItems(newSelection)
    onSelectionChange?.(newSelection)
  }, [filteredData, selectedItems, onSelectionChange])

  const handleSaveSearch = useCallback(() => {
    if (saveSearchName.trim() && onSaveSearch) {
      onSaveSearch(saveSearchName.trim(), filters)
      setSaveSearchName('')
      setShowSaveDialog(false)
    }
  }, [saveSearchName, filters, onSaveSearch])

  const loadSavedSearch = useCallback((savedFilters: SearchFilters) => {
    setFilters(savedFilters)
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.query) {count++}
    if (filters.hsCodePattern) {count++}
    if (filters.categories.length > 0) {count++}
    if (filters.sources.length > 0) {count++}
    if (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100) {count++}
    if (filters.riskLevels.length > 0) {count++}
    if (filters.validationStatuses.length > 0) {count++}
    if (filters.dateRange?.from || filters.dateRange?.to) {count++}
    if (filters.countries.length > 0) {count++}
    if (filters.tags.length > 0) {count++}
    if (filters.complianceFlags.length > 0) {count++}
    if (filters.hasImageAnalysis !== undefined) {count++}
    if (filters.hasExpertReview !== undefined) {count++}
    if (filters.minAlternatives !== undefined) {count++}
    return count
  }, [filters])

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Classification Search</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {filteredData.length} of {data.length} classification{data.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced
                {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Basic Search */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Search Query</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products, descriptions, HS codes..."
                    value={filters.query}
                    onChange={(e) => updateFilter('query', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>HS Code Pattern</Label>
                <Input
                  placeholder="e.g., 8471* or 84.71.30.*"
                  value={filters.hsCodePattern}
                  onChange={(e) => updateFilter('hsCodePattern', e.target.value)}
                />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map(source => (
                <Badge
                  key={source.value}
                  variant={filters.sources.includes(source.value) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    filters.sources.includes(source.value) ? source.color : ''
                  }`}
                  onClick={() => toggleArrayFilter('sources', source.value)}
                >
                  {source.label}
                </Badge>
              ))}
              
              <Separator orientation="vertical" className="h-6" />
              
              {riskOptions.map(risk => (
                <Badge
                  key={risk.value}
                  variant={filters.riskLevels.includes(risk.value) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    filters.riskLevels.includes(risk.value) ? risk.color : ''
                  }`}
                  onClick={() => toggleArrayFilter('riskLevels', risk.value)}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {risk.label}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Advanced Filters */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleContent className="space-y-6 mt-6">
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Categories */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Categories</span>
                  </Label>
                  <ScrollArea className="h-32 border rounded p-2">
                    <div className="space-y-2">
                      {filterOptions.categories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={filters.categories.includes(category)}
                            onCheckedChange={() => toggleArrayFilter('categories', category)}
                          />
                          <Label htmlFor={`category-${category}`} className="text-sm">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Countries */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Countries</span>
                  </Label>
                  <ScrollArea className="h-32 border rounded p-2">
                    <div className="space-y-2">
                      {filterOptions.countries.map(country => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country}`}
                            checked={filters.countries.includes(country)}
                            onCheckedChange={() => toggleArrayFilter('countries', country)}
                          />
                          <Label htmlFor={`country-${country}`} className="text-sm">
                            {country}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Tags */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Tag className="h-4 w-4" />
                    <span>Tags</span>
                  </Label>
                  <ScrollArea className="h-32 border rounded p-2">
                    <div className="space-y-2">
                      {filterOptions.tags.map(tag => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={filters.tags.includes(tag)}
                            onCheckedChange={() => toggleArrayFilter('tags', tag)}
                          />
                          <Label htmlFor={`tag-${tag}`} className="text-sm">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confidence Range */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Confidence Range: {filters.confidenceRange[0]}% - {filters.confidenceRange[1]}%</span>
                  </Label>
                  <Slider
                    value={filters.confidenceRange}
                    onValueChange={(value) => updateFilter('confidenceRange', value as [number, number])}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                {/* Date Range */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Date Range</span>
                  </Label>
                  <DatePickerWithRange
                    date={filters.dateRange}
                    setDate={(dateRange) => updateFilter('dateRange', dateRange)}
                  />
                </div>
              </div>
              
              {/* Validation Status */}
              <div className="space-y-3">
                <Label>Validation Status</Label>
                <div className="flex flex-wrap gap-2">
                  {validationOptions.map(status => (
                    <Badge
                      key={status.value}
                      variant={filters.validationStatuses.includes(status.value) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        filters.validationStatuses.includes(status.value) ? status.color : ''
                      }`}
                      onClick={() => toggleArrayFilter('validationStatuses', status.value)}
                    >
                      {status.label}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Additional Options */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasImageAnalysis"
                    checked={filters.hasImageAnalysis === true}
                    onCheckedChange={(checked) => 
                      updateFilter('hasImageAnalysis', checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="hasImageAnalysis" className="text-sm">
                    Has Image Analysis
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasExpertReview"
                    checked={filters.hasExpertReview === true}
                    onCheckedChange={(checked) => 
                      updateFilter('hasExpertReview', checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="hasExpertReview" className="text-sm">
                    Has Expert Review
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="minAlternatives" className="text-sm">
                    Min. Alternatives
                  </Label>
                  <Select
                    value={filters.minAlternatives?.toString() || ''}
                    onValueChange={(value) => 
                      updateFilter('minAlternatives', value ? parseInt(value) : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      
      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saved Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((saved, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => loadSavedSearch(saved.filters)}
                >
                  {saved.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Results Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {showBulkActions && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600">
                    {selectedItems.length} selected
                  </span>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Showing {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Sort by:</Label>
              <Select
                value={`${sortConfig.field}-${sortConfig.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split('-') as [keyof ClassificationItem | 'relevance', 'asc' | 'desc']
                  setSortConfig({ field, direction })
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance-desc">Relevance</SelectItem>
                  <SelectItem value="timestamp-desc">Newest First</SelectItem>
                  <SelectItem value="timestamp-asc">Oldest First</SelectItem>
                  <SelectItem value="confidence-desc">Highest Confidence</SelectItem>
                  <SelectItem value="confidence-asc">Lowest Confidence</SelectItem>
                  <SelectItem value="hsCode-asc">HS Code A-Z</SelectItem>
                  <SelectItem value="hsCode-desc">HS Code Z-A</SelectItem>
                  <SelectItem value="productName-asc">Product Name A-Z</SelectItem>
                  <SelectItem value="productName-desc">Product Name Z-A</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Save Search Dialog */}
      {showSaveDialog && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Enter search name..."
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveSearch} disabled={!saveSearchName.trim()}>
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}