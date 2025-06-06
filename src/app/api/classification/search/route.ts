import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface SearchRequest {
  query: string
  limit?: number
  category?: string
}

interface SearchResult {
  code: string
  description: string
  confidence: number
  chapter: string
  chapterDescription: string
}

interface SearchResponse {
  codes: SearchResult[]
  totalResults: number
}

// Sample HS code database - in production, this would come from a proper database
const HS_CODE_DATABASE = [
  // Electronics
  { code: '8517120000', description: 'Telephones for cellular networks or for other wireless networks', keywords: ['phone', 'mobile', 'cellular', 'smartphone', 'wireless'] },
  { code: '8528720000', description: 'Other monitors capable of directly connecting to and designed for use with an automatic data processing machine', keywords: ['monitor', 'display', 'screen', 'computer'] },
  { code: '8471300000', description: 'Portable automatic data processing machines, weighing not more than 10 kg', keywords: ['laptop', 'notebook', 'portable', 'computer'] },
  { code: '8518210000', description: 'Single loudspeakers, mounted in their enclosures', keywords: ['speaker', 'audio', 'sound'] },
  { code: '8518300000', description: 'Headphones and earphones, whether or not combined with a microphone', keywords: ['headphones', 'earphones', 'earbuds', 'audio'] },
  { code: '8507600000', description: 'Lithium-ion batteries', keywords: ['battery', 'lithium', 'power', 'rechargeable'] },
  { code: '8544421000', description: 'Electric conductors, for a voltage not exceeding 1,000 V, fitted with connectors, used for telecommunications', keywords: ['cable', 'wire', 'connector', 'usb'] },
  
  // Clothing
  { code: '6109100000', description: 'T-shirts, singlets and other vests, of cotton, knitted or crocheted', keywords: ['t-shirt', 'shirt', 'cotton', 'clothing'] },
  { code: '6203420000', description: 'Men\'s or boys\' trousers, bib and brace overalls, breeches and shorts, of cotton', keywords: ['pants', 'trousers', 'jeans', 'cotton', 'men'] },
  { code: '6204620000', description: 'Women\'s or girls\' trousers, bib and brace overalls, breeches and shorts, of cotton', keywords: ['pants', 'trousers', 'jeans', 'cotton', 'women'] },
  { code: '6402910000', description: 'Footwear with outer soles and uppers of rubber or plastics, covering the ankle', keywords: ['shoes', 'boots', 'footwear', 'rubber', 'plastic'] },
  { code: '6505000000', description: 'Hats and other headgear, knitted or crocheted, or made up from lace, felt or other textile materials', keywords: ['hat', 'cap', 'headwear'] },
  
  // Home & Garden
  { code: '9403200000', description: 'Other metal furniture', keywords: ['furniture', 'metal', 'chair', 'table'] },
  { code: '9404210000', description: 'Mattresses of cellular rubber or plastics, whether or not covered', keywords: ['mattress', 'foam', 'bed'] },
  { code: '6302210000', description: 'Bed linen of cotton, printed', keywords: ['bedding', 'sheets', 'cotton', 'bed'] },
  { code: '7013220000', description: 'Drinking glasses, other than of glass-ceramics, of lead crystal', keywords: ['glass', 'cup', 'drinking', 'crystal'] },
  { code: '8516600000', description: 'Other ovens; cookers, cooking plates, boiling rings, grillers and roasters', keywords: ['oven', 'cooker', 'kitchen', 'appliance'] },
  
  // Sports & Outdoors
  { code: '9506290000', description: 'Other water-ski, surf-boards, sailboards and other water-sport equipment', keywords: ['surfboard', 'water', 'sports', 'board'] },
  { code: '9506620000', description: 'Inflatable balls', keywords: ['ball', 'sports', 'inflatable', 'soccer', 'football'] },
  { code: '9506990000', description: 'Other articles and equipment for general physical exercise, gymnastics or athletics', keywords: ['exercise', 'fitness', 'gym', 'sports'] },
  { code: '8712000000', description: 'Bicycles and other cycles (including delivery tricycles), not motorised', keywords: ['bicycle', 'bike', 'cycle'] },
  
  // Health & Beauty
  { code: '3304990000', description: 'Other beauty or make-up preparations and preparations for the care of the skin', keywords: ['cosmetics', 'makeup', 'beauty', 'skincare'] },
  { code: '3305100000', description: 'Shampoos', keywords: ['shampoo', 'hair', 'care'] },
  { code: '3401110000', description: 'Soap and organic surface-active products and preparations, in the form of bars', keywords: ['soap', 'bar', 'cleaning'] },
  { code: '9018390000', description: 'Other syringes, needles, catheters, cannulae and the like', keywords: ['medical', 'syringe', 'needle', 'healthcare'] },
  
  // Food & Beverages
  { code: '0901210000', description: 'Coffee, roasted, not decaffeinated', keywords: ['coffee', 'roasted', 'beans'] },
  { code: '1704900000', description: 'Other sugar confectionery not containing cocoa', keywords: ['candy', 'sweets', 'sugar', 'confectionery'] },
  { code: '2009110000', description: 'Orange juice, frozen', keywords: ['orange', 'juice', 'frozen'] },
  { code: '1905310000', description: 'Sweet biscuits', keywords: ['biscuits', 'cookies', 'sweet'] },
  { code: '0403100000', description: 'Yogurt', keywords: ['yogurt', 'dairy'] },
  
  // Automotive
  { code: '8708210000', description: 'Safety seat belts', keywords: ['seatbelt', 'safety', 'car', 'automotive'] },
  { code: '8708299000', description: 'Other parts and accessories of bodies (including cabs)', keywords: ['car', 'parts', 'automotive', 'body'] },
  { code: '4011100000', description: 'New pneumatic tyres, of rubber, of a kind used on motor cars', keywords: ['tire', 'tyre', 'car', 'rubber'] },
  { code: '8507200000', description: 'Other lead-acid accumulators', keywords: ['battery', 'car', 'lead', 'automotive'] },
  
  // Books & Media
  { code: '4901990000', description: 'Other printed books, brochures, leaflets and similar printed matter', keywords: ['book', 'printed', 'reading'] },
  { code: '8523492000', description: 'Other optical media', keywords: ['dvd', 'cd', 'optical', 'media'] },
  { code: '4909000000', description: 'Printed or illustrated postcards; printed cards bearing personal greetings', keywords: ['postcard', 'greeting', 'card'] },
  
  // Toys & Games
  { code: '9503006000', description: 'Other toys, put up in sets or outfits', keywords: ['toy', 'set', 'children', 'play'] },
  { code: '9504200000', description: 'Articles and accessories for billiards', keywords: ['billiards', 'pool', 'game'] },
  { code: '9503008900', description: 'Other toys', keywords: ['toy', 'children', 'play'] },
  
  // Industrial & Scientific
  { code: '9027809900', description: 'Other instruments and apparatus for physical or chemical analysis', keywords: ['instrument', 'analysis', 'scientific', 'laboratory'] },
  { code: '8479899700', description: 'Other machines and mechanical appliances having individual functions', keywords: ['machine', 'mechanical', 'industrial'] },
  { code: '3926909900', description: 'Other articles of plastics', keywords: ['plastic', 'industrial', 'parts'] }
]

const HS_CHAPTERS = {
  '01': 'Live animals',
  '02': 'Meat and edible meat offal',
  '03': 'Fish and crustaceans, molluscs and other aquatic invertebrates',
  '04': 'Dairy produce; birds\' eggs; natural honey; edible products of animal origin',
  '05': 'Products of animal origin, not elsewhere specified or included',
  '06': 'Live trees and other plants; bulbs, roots and the like; cut flowers',
  '07': 'Edible vegetables and certain roots and tubers',
  '08': 'Edible fruit and nuts; peel of citrus fruit or melons',
  '09': 'Coffee, tea, maté and spices',
  '10': 'Cereals',
  '84': 'Nuclear reactors, boilers, machinery and mechanical appliances',
  '85': 'Electrical machinery and equipment and parts thereof',
  '61': 'Articles of apparel and clothing accessories, knitted or crocheted',
  '62': 'Articles of apparel and clothing accessories, not knitted or crocheted',
  '64': 'Footwear, gaiters and the like; parts of such articles',
  '94': 'Furniture; bedding, mattresses, mattress supports, cushions',
  '95': 'Toys, games and sports requisites; parts and accessories thereof',
  '33': 'Essential oils and resinoids; perfumery, cosmetic or toilet preparations',
  '87': 'Vehicles other than railway or tramway rolling-stock, and parts',
  '49': 'Printed books, newspapers, pictures and other products of the printing industry',
  '90': 'Optical, photographic, cinematographic, measuring, checking, precision instruments'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SearchRequest = await request.json()
    const { query, limit = 10, category } = body

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const searchResults = await searchHsCodes(query.trim().toLowerCase(), limit, category)
    
    return NextResponse.json({
      codes: searchResults,
      totalResults: searchResults.length
    })
  } catch (error) {
    console.error('Error searching HS codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function searchHsCodes(
  query: string, 
  limit: number, 
  category?: string
): Promise<SearchResult[]> {
  const queryWords = query.split(/\s+/).filter(word => word.length > 1)
  const results: Array<SearchResult & { score: number }> = []

  for (const item of HS_CODE_DATABASE) {
    let score = 0
    const chapter = item.code.substring(0, 2)
    const chapterDescription = HS_CHAPTERS[chapter] || 'Unknown chapter'
    
    // Check description match
    const descriptionLower = item.description.toLowerCase()
    for (const word of queryWords) {
      if (descriptionLower.includes(word)) {
        score += 10
      }
    }
    
    // Check keyword match (higher weight)
    for (const keyword of item.keywords) {
      for (const word of queryWords) {
        if (keyword.includes(word) || word.includes(keyword)) {
          score += 20
        }
        if (keyword === word) {
          score += 30 // Exact match
        }
      }
    }
    
    // Partial matches
    for (const word of queryWords) {
      for (const keyword of item.keywords) {
        if (keyword.length > 3 && word.length > 3) {
          const similarity = calculateSimilarity(word, keyword)
          if (similarity > 0.7) {
            score += Math.floor(similarity * 15)
          }
        }
      }
    }
    
    // Category filtering (if provided)
    if (category) {
      const categoryChapters = getCategoryChapters(category)
      if (categoryChapters && !categoryChapters.includes(chapter)) {
        score *= 0.5 // Reduce score for non-matching categories
      }
    }
    
    if (score > 0) {
      results.push({
        code: item.code,
        description: item.description,
        confidence: Math.min(Math.round((score / 50) * 100), 100),
        chapter,
        chapterDescription,
        score
      })
    }
  }
  
  // Sort by score and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...result }) => result)
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) {return 1.0}
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

function getCategoryChapters(category: string): string[] | null {
  const categoryMapping: Record<string, string[]> = {
    'Electronics': ['84', '85', '90', '91'],
    'Clothing & Accessories': ['61', '62', '64', '65', '71'],
    'Home & Garden': ['94', '68', '69', '70', '73'],
    'Sports & Outdoors': ['95', '87', '89'],
    'Health & Beauty': ['30', '33', '34'],
    'Automotive': ['87', '40', '73', '84'],
    'Books & Media': ['49', '85'],
    'Toys & Games': ['95'],
    'Food & Beverages': ['01', '02', '03', '04', '07', '08', '09', '16', '17', '18', '19', '20', '21', '22'],
    'Industrial & Scientific': ['28', '29', '38', '84', '85', '90'],
    'Office Products': ['48', '49', '84', '85']
  }
  
  return categoryMapping[category] || null
}