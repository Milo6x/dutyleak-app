import { ZonosClient } from '../external/zonos-client';
import { OpenAIClient } from '../external/openai-client';
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'
import HSCodeValidator from '../validation/hs-code-validation'
import BusinessLogicEngine from '../business-logic/classification-engine'
import TradeComplianceChecker from '../compliance/trade-compliance'
import ConfidenceThresholdManager from '../confidence/threshold-manager'
import { AutomaticFlaggingSystem, ClassificationContext } from '../review/automatic-flagging-system'

export interface ClassificationRequest {
  productId: string;
  productName: string;
  productDescription?: string;
  imageUrl?: string;
  existingHsCode?: string;
  forceReview?: boolean;
  reviewReason?: string;
}

export interface ClassificationResult {
  success: boolean;
  productId: string;
  hsCode?: string;
  hs6?: string;
  hs8?: string;
  confidenceScore?: number;
  source?: string;
  rulingReference?: string;
  classificationId?: string;
  addedToReviewQueue?: boolean;
  reviewQueueId?: string;
  error?: string;
}

export interface BatchClassificationResult {
  success: boolean;
  results: ClassificationResult[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
}

export class ClassificationEngine {
  private zonosClient: ZonosClient;
  private openaiClient: OpenAIClient;
  private confidenceThreshold: number;
  private flaggingSystem: AutomaticFlaggingSystem | null = null;

  constructor(confidenceThreshold: number = 0.7) {
    this.zonosClient = new ZonosClient();
    this.openaiClient = new OpenAIClient();
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Initialize the automatic flagging system with Supabase client
   */
  private initializeFlaggingSystem(supabase: SupabaseClient<Database>): void {
    if (!this.flaggingSystem) {
      this.flaggingSystem = new AutomaticFlaggingSystem(supabase, {
        confidenceThreshold: this.confidenceThreshold * 100, // Convert to percentage
        inconsistencyThreshold: 0.3,
        complexityThreshold: 0.7,
        enableHistoricalCheck: true,
        enableComplianceCheck: true,
        enableDutyRateCheck: true
      });
    }
  }

  /**
   * Classify a single product using available classification services
   */
  async classifyProduct(request: ClassificationRequest, supabase: SupabaseClient<Database>): Promise<ClassificationResult> {
    try {
      // Get product from database to verify access rights
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, workspace_id')
        .eq('id', request.productId)
        .single();

      if (productError || !product) {
        return {
          success: false,
          productId: request.productId,
          error: 'Product not found or access denied'
        };
      }

      // Try classification services in order of preference
      let classificationResult;
      let source = '';
      let confidenceScore = 0;

      // 1. Try Zonos first (if configured)
      if (process.env.ZONOS_API_KEY) {
        classificationResult = await this.zonosClient.classifyProduct(
          request.productName,
          request.productDescription,
          request.existingHsCode
        );

        if (classificationResult.success) {
          source = 'zonos';
          confidenceScore = classificationResult.confidenceScore || 0;
        }
      }

      // 2. Try OpenAI if Zonos failed or is not configured
      if (!classificationResult?.success && process.env.OPENAI_API_KEY) {
        classificationResult = await this.openaiClient.classifyProduct(
          request.productName,
          request.productDescription,
          request.imageUrl
        );

        if (classificationResult.success) {
          source = 'openai';
          confidenceScore = classificationResult.confidenceScore || 0;
        }
      }

      // If all classification services fail
      if (!classificationResult?.success) {
        return {
          success: false,
          productId: request.productId,
          error: classificationResult?.error || 'All classification services failed'
        };
      }

      const hsCode = classificationResult.hsCode || '';
      if (!hsCode) {
        return {
          success: false,
          productId: request.productId,
          error: 'No HS code returned from classification service'
        };
      }

      // Determine HS6 and HS8
      const hs6 = hsCode.substring(0, 6);
      const hs8 = hsCode.length >= 8 ? hsCode : null;

      // Initialize automatic flagging system
      this.initializeFlaggingSystem(supabase);

      // Get historical classifications for consistency check
      const { data: historicalClassifications } = await supabase
        .from('classifications')
        .select('hs6, hs8, confidence_score, created_at')
        .eq('product_id', request.productId)
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get product details for flagging analysis
      const { data: productDetails } = await supabase
        .from('products')
        .select('title, description, metadata')
        .eq('id', request.productId)
        .single();

      // Store classification in database first
      const { data: classification, error: classificationError } = await supabase
        .from('classifications')
        .insert({
          product_id: request.productId,
          workspace_id: product.workspace_id,
          hs6,
          hs8,
          confidence_score: confidenceScore,
          source,
          ruling_reference: classificationResult.rulingReference || source,
          is_active: false // Will be set to active after flagging analysis
        })
        .select()
        .single();

      if (classificationError) {
        return {
          success: false,
          productId: request.productId,
          error: `Failed to store classification: ${classificationError.message}`
        };
      }

      // Prepare context for automatic flagging system
      const flaggingContext: ClassificationContext = {
        productId: request.productId,
        hsCode,
        confidence: confidenceScore * 100, // Convert to percentage
        productDescription: productDetails?.description || request.productDescription || '',
        intendedUse: (productDetails?.metadata as any)?.intended_use,
        materials: (productDetails?.metadata as any)?.materials ? [(productDetails?.metadata as any)?.materials] : undefined,
        countryOfOrigin: (productDetails?.metadata as any)?.country_of_origin,
        historicalClassifications: historicalClassifications?.map(h => ({
          hsCode: h.hs8 || h.hs6 || '',
          confidence: (h.confidence_score || 0) * 100,
          createdAt: new Date(h.created_at)
        })) || []
      };

      // Handle review queue with automatic flagging system
      let reviewQueueId = null;
      let addedToReviewQueue = false;
      let shouldReview = request.forceReview;

      if (this.flaggingSystem && !request.forceReview) {
        // Use automatic flagging system to determine if review is needed
        const flaggingResult = await this.flaggingSystem.processAndFlag(
          flaggingContext,
          product.workspace_id,
          classification.id
        );

        if (flaggingResult.flagged) {
          reviewQueueId = flaggingResult.reviewQueueId || null;
          addedToReviewQueue = true;
          shouldReview = true;
        }
      } else if (request.forceReview) {
        // Manual review requested - use traditional method
        const reason = request.reviewReason || 'Manual review requested';

        const { data: reviewItem, error: reviewError } = await supabase
          .from('review_queue')
          .insert({
            workspace_id: product.workspace_id,
            product_id: request.productId,
            classification_id: classification.id,
            confidence_score: confidenceScore,
            reason,
            status: 'pending'
          })
          .select()
          .single();

        if (!reviewError && reviewItem) {
          reviewQueueId = reviewItem.id;
          addedToReviewQueue = true;
          shouldReview = true;
        } else {
          console.error('Failed to add to review queue:', reviewError);
        }
      }

      // If not flagged for review, make classification active
      if (!shouldReview) {
        await supabase
          .from('classifications')
          .update({ is_active: true })
          .eq('id', classification.id);

        await supabase
          .from('products')
          .update({
            active_classification_id: classification.id
          })
          .eq('id', request.productId);
      }

      return {
        success: true,
        productId: request.productId,
        hsCode,
        hs6,
        hs8,
        confidenceScore,
        source,
        rulingReference: classificationResult.rulingReference,
        classificationId: classification.id,
        addedToReviewQueue,
        reviewQueueId
      };

    } catch (error) {
      console.error('Classification engine error:', error);
      return {
        success: false,
        productId: request.productId,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Classify multiple products in batch
   */
  async classifyBatch(requests: ClassificationRequest[], supabase: SupabaseClient<Database>): Promise<BatchClassificationResult> {
    const results: ClassificationResult[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process in batches to avoid overwhelming the APIs
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(request => this.classifyProduct(request, supabase));
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Product ${batch[index].productId}: ${result.value.error}`);
          }
        } else {
          errorCount++;
          const productId = batch[index].productId;
          errors.push(`Product ${productId}: ${result.reason}`);
          results.push({
            success: false,
            productId,
            error: result.reason.toString()
          });
        }
      });

      // Add a small delay between batches to be respectful to APIs
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: errorCount === 0,
      results,
      totalProcessed: requests.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get classification history for a product
   */
  async getClassificationHistory(productId: string, supabase: SupabaseClient<Database>): Promise<any[]> {
    try {

      const { data: classifications, error } = await supabase
        .from('classifications')
        .select(`
          id,
          hs6,
          hs8,
          confidence_score,
          source,
          ruling_reference,
          is_active,
          created_at
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching classification history:', error);
        return [];
      }

      return classifications || [];
    } catch (error) {
      console.error('Error in getClassificationHistory:', error);
      return [];
    }
  }

  /**
   * Update confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get current confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}

// Export a default instance
export const classificationEngine = new ClassificationEngine();