'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, CheckCircle, AlertCircle, FileText, Bot, User, Download, Filter, BarChart3, History, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface ClassificationHistoryItem {
  id: string;
  hs6?: string;
  hs8?: string;
  confidence_score?: number;
  source: string;
  ruling_reference?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  classification_data?: any;
  change_reason?: string;
  previous_hs_code?: string;
  validation_status?: string;
  override_reason?: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
}

interface AuditSummary {
  totalEntries: number;
  uniqueUsers: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  changeTypes: {
    manual_override: number;
    ai_classification: number;
    validation: number;
    correction: number;
    other: number;
  };
  approvalStatus: {
    pending: number;
    approved: number;
    rejected: number;
    not_required: number;
  };
}

interface ClassificationHistoryProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ClassificationHistory({ productId, isOpen, onClose }: ClassificationHistoryProps) {
  const [history, setHistory] = useState<ClassificationHistoryItem[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('history');
  const [includeMetadata, setIncludeMetadata] = useState(true);

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory();
    }
  }, [isOpen, productId, includeMetadata]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        includeMetadata: includeMetadata.toString(),
        limit: '50',
        offset: '0'
      });
      
      const response = await fetch(`/api/core/classify-hs/history/${productId}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch classification history');
      }
      
      const data = await response.json();
      setHistory(data.history || []);
      setAuditSummary(data.auditSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/classification/export/${productId}?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `classification-history-${productId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) {return 'bg-gray-100 text-gray-800';}
    if (score >= 0.8) {return 'bg-green-100 text-green-800';}
    if (score >= 0.6) {return 'bg-yellow-100 text-yellow-800';}
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (score?: number) => {
    if (!score) {return 'Unknown';}
    if (score >= 0.8) {return 'High';}
    if (score >= 0.6) {return 'Medium';}
    return 'Low';
  };

  const getSourceIcon = (source?: string) => {
    switch (source?.toLowerCase()) {
      case 'manual':
        return <User className="h-4 w-4" />;
      case 'ai':
      case 'openai':
      case 'anthropic':
      case 'zonos':
        return <Bot className="h-4 w-4" />;
      case 'audit_log':
        return <Shield className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getApprovalStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Enhanced Classification History
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center py-4 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History ({history.length})
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Audit Trail
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  No classification history found for this product.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Showing {history.length} classification{history.length !== 1 ? 's' : ''}
                  </div>
                  
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.is_active && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                              <span className="text-lg">
                                {getSourceIcon(item.source)}
                              </span>
                              <span className="text-sm text-gray-500">
                                Classification #{index + 1}
                              </span>
                              <span className="text-sm text-gray-400">
                                {formatDate(item.created_at)}
                              </span>
                              {getApprovalStatusBadge(item.approval_status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-1">
                                  HS Code
                                </div>
                                <div className="text-lg font-mono">
                                  {item.hs8 || item.hs6 || 'Not classified'}
                                </div>
                                {item.previous_hs_code && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Previous: {item.previous_hs_code}
                                  </div>
                                )}
                              </div>

                              {item.confidence_score && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">
                                    Confidence
                                  </div>
                                  <Badge className={getConfidenceColor(item.confidence_score)}>
                                    {getConfidenceLabel(item.confidence_score)} ({Math.round(item.confidence_score * 100)}%)
                                  </Badge>
                                </div>
                              )}

                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-1">
                                  Source
                                </div>
                                <div className="text-sm">
                                  {item.source || 'Unknown'}
                                </div>
                              </div>

                              {item.ruling_reference && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">
                                    Ruling Reference
                                  </div>
                                  <div className="text-sm font-mono">
                                    {item.ruling_reference}
                                  </div>
                                </div>
                              )}

                              {item.change_reason && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">
                                    Change Reason
                                  </div>
                                  <div className="text-sm">
                                    {item.change_reason}
                                  </div>
                                </div>
                              )}

                              {item.validation_status && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">
                                    Validation
                                  </div>
                                  <Badge variant={item.validation_status === 'valid' ? 'default' : 'destructive'}>
                                    {item.validation_status}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {(item.hs8 || item.hs6) && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium text-gray-700 mb-1">
                                  HS Code Breakdown
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  {item.hs6 && (
                                    <>
                                      <div>
                                        <span className="font-mono">{item.hs6.substring(0, 2)}</span> - Chapter
                                      </div>
                                      <div>
                                        <span className="font-mono">{item.hs6.substring(0, 4)}</span> - Heading
                                      </div>
                                      <div>
                                        <span className="font-mono">{item.hs6}</span> - Subheading (6-digit)
                                      </div>
                                    </>
                                  )}
                                  {item.hs8 && (
                                    <div>
                                      <span className="font-mono">{item.hs8}</span> - Statistical Suffix (8-digit)
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.filter(item => item.change_reason || item.override_reason || item.approval_status).map((item, index) => (
                  <Card key={item.id || index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Audit Entry #{index + 1}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(item.created_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <strong>HS Code:</strong> {item.hs8 || item.hs6 || 'N/A'}
                      </div>
                      {item.change_reason && (
                        <div className="text-sm">
                          <strong>Reason:</strong> {item.change_reason}
                        </div>
                      )}
                      {item.override_reason && (
                        <div className="text-sm">
                          <strong>Override:</strong> {item.override_reason}
                        </div>
                      )}
                      {item.approval_status && (
                        <div className="text-sm flex items-center gap-2">
                          <strong>Status:</strong> {getApprovalStatusBadge(item.approval_status)}
                        </div>
                      )}
                      {item.approved_by && (
                        <div className="text-sm">
                          <strong>Approved by:</strong> {item.approved_by}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {history.filter(item => item.change_reason || item.override_reason || item.approval_status).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  No audit trail entries found.
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {auditSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-2xl font-bold">{auditSummary.totalEntries}</div>
                      <div className="text-sm text-gray-600">Total Entries</div>
                      <div className="text-lg font-semibold">{auditSummary.uniqueUsers}</div>
                      <div className="text-sm text-gray-600">Unique Users</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Change Types</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Manual Override:</span>
                        <span className="font-semibold">{auditSummary.changeTypes.manual_override}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">AI Classification:</span>
                        <span className="font-semibold">{auditSummary.changeTypes.ai_classification}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Validation:</span>
                        <span className="font-semibold">{auditSummary.changeTypes.validation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Correction:</span>
                        <span className="font-semibold">{auditSummary.changeTypes.correction}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Approval Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Pending:</span>
                        <span className="font-semibold text-yellow-600">{auditSummary.approvalStatus.pending}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Approved:</span>
                        <span className="font-semibold text-green-600">{auditSummary.approvalStatus.approved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Rejected:</span>
                        <span className="font-semibold text-red-600">{auditSummary.approvalStatus.rejected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Not Required:</span>
                        <span className="font-semibold">{auditSummary.approvalStatus.not_required}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {auditSummary.dateRange.earliest && auditSummary.dateRange.latest && (
                    <Card className="md:col-span-2 lg:col-span-3">
                      <CardHeader>
                        <CardTitle className="text-sm">Date Range</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-600">Earliest Entry</div>
                            <div className="font-semibold">{formatDate(auditSummary.dateRange.earliest)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Latest Entry</div>
                            <div className="font-semibold">{formatDate(auditSummary.dateRange.latest)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  No analytics data available.
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ClassificationHistory;