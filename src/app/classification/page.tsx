'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import HSCodeClassifier from '@/components/classification/hs-code-classifier'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpenIcon, 
  LightBulbIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { ClassificationResult } from '@/lib/classification/hs-code-classifier'

export default function ClassificationPage() {
  const [recentClassifications, setRecentClassifications] = useState<ClassificationResult[]>([])

  const handleClassificationComplete = (result: ClassificationResult) => {
    setRecentClassifications(prev => [result, ...prev.slice(0, 4)])
  }

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Classification',
      description: 'Advanced AI models analyze your product descriptions for accurate HS code classification'
    },
    {
      icon: ClockIcon,
      title: 'Instant Results',
      description: 'Get classification results in seconds, not hours or days'
    },
    {
      icon: CheckCircleIcon,
      title: 'High Accuracy',
      description: 'Multiple AI sources with confidence scoring ensure reliable classifications'
    },
    {
      icon: BookOpenIcon,
      title: 'Detailed Reasoning',
      description: 'Understand why each classification was chosen with detailed explanations'
    }
  ]

  const tips = [
    {
      title: 'Be Specific',
      description: 'Include material composition, intended use, and key characteristics'
    },
    {
      title: 'Mention Materials',
      description: 'Specify primary materials (cotton, steel, plastic, etc.) as they heavily influence classification'
    },
    {
      title: 'Include Dimensions',
      description: 'Size, weight, and dimensions can affect HS code classification'
    },
    {
      title: 'State the Purpose',
      description: 'Explain what the product is used for or its intended application'
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HS Code Classification</h1>
          <p className="mt-2 text-lg text-gray-600">
            Get accurate Harmonized System (HS) codes for your products using AI-powered classification
          </p>
        </div>

        <Tabs defaultValue="classify" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="classify">Classify Product</TabsTrigger>
            <TabsTrigger value="recent">Recent Classifications</TabsTrigger>
            <TabsTrigger value="help">Help & Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="classify" className="space-y-6">
            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{feature.title}</h3>
                          <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Main Classification Interface */}
            <HSCodeClassifier onClassificationComplete={handleClassificationComplete} />
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Classifications</CardTitle>
                <CardDescription>
                  Your most recent HS code classifications from this session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentClassifications.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent classifications</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start classifying products to see your recent results here.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => (document.querySelector('[value="classify"]') as HTMLElement)?.click()}>
                        <ArrowRightIcon className="mr-2 h-4 w-4" />
                        Start Classifying
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentClassifications.map((result, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-semibold text-lg">{result.hsCode}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">{result.source.toUpperCase()}</Badge>
                            <Badge 
                              className={
                                result.confidence >= 80 ? 'bg-green-100 text-green-800' :
                                result.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {result.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-2">{result.description}</p>
                        <p className="text-sm text-gray-600">{result.reasoning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="space-y-6">
            {/* Classification Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LightBulbIcon className="mr-2 h-5 w-5" />
                  Classification Tips
                </CardTitle>
                <CardDescription>
                  Follow these tips to get the most accurate HS code classifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tips.map((tip, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">{tip.title}</h3>
                      <p className="text-sm text-gray-600">{tip.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Example Classifications */}
            <Card>
              <CardHeader>
                <CardTitle>Example Product Descriptions</CardTitle>
                <CardDescription>
                  See examples of well-written product descriptions that lead to accurate classifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">✓ Good Example</h4>
                    <p className="text-sm text-green-700 mb-2">
                      "Men's cotton t-shirts, 100% cotton knit fabric, short sleeve, crew neck, 
                      sizes S-XL, for casual wear, plain colors (white, black, navy), 
                      weight approximately 180gsm"
                    </p>
                    <Badge className="bg-green-100 text-green-800">Likely HS Code: 6109.10</Badge>
                  </div>
                  
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">✗ Poor Example</h4>
                    <p className="text-sm text-red-700 mb-2">
                      "Shirts for men"
                    </p>
                    <p className="text-xs text-red-600">
                      Too vague - missing material, style, and construction details
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HS Code Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
                <CardDescription>
                  External resources to help you understand HS codes better
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx', '_blank')}
                  >
                    <BookOpenIcon className="mr-2 h-4 w-4" />
                    WTO Harmonized System Database
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://hts.usitc.gov/', '_blank')}
                  >
                    <BookOpenIcon className="mr-2 h-4 w-4" />
                    US Customs HS Code Lookup
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp', '_blank')}
                  >
                    <BookOpenIcon className="mr-2 h-4 w-4" />
                    EU TARIC Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}