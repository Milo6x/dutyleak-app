'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input' // For potential filter inputs
import { Checkbox } from '@/components/ui/checkbox' // For field selection
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { DownloadIcon, Loader2, Settings2Icon } from 'lucide-react'
// Assuming DateRangePicker is available or a similar component for date filters
// import { DateRangePicker } from '@/components/ui/date-range-picker'; 

// Define available data sources and their potential fields
// In a real app, this might come from a configuration or be dynamically generated
const DATA_SOURCES = {
  products: {
    label: 'Products',
    fields: ['id', 'name', 'category', 'cost', 'price', 'created_at', 'workspace_id'],
    defaultFields: ['id', 'name', 'category', 'cost', 'price']
  },
  classifications: {
    label: 'Classifications',
    fields: ['id', 'product_id', 'classification_code', 'confidence_score', 'source', 'created_at', 'workspace_id'],
    defaultFields: ['product_id', 'classification_code', 'confidence_score', 'source']
  },
  savings_ledger: {
    label: 'Savings Ledger',
    fields: ['id', 'product_id', 'savings_amount', 'savings_percentage', 'created_at', 'workspace_id'],
    defaultFields: ['product_id', 'savings_amount', 'savings_percentage', 'created_at']
  },
  // Add more data sources as needed, e.g., jobs, review_queue
};

type DataSourceKey = keyof typeof DATA_SOURCES;

export default function CustomReportsPage() {
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceKey | undefined>(undefined);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportData, setReportData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update available fields when data source changes
  useEffect(() => {
    if (selectedDataSource) {
      setSelectedFields(DATA_SOURCES[selectedDataSource].defaultFields);
    } else {
      setSelectedFields([]);
    }
    setReportData([]); // Clear previous report data
  }, [selectedDataSource]);

  const handleFieldChange = (field: string, checked: boolean) => {
    setSelectedFields(prev => 
      checked ? [...prev, field] : prev.filter(f => f !== field)
    );
  };

  const generateReport = useCallback(async () => {
    if (!selectedDataSource || selectedFields.length === 0) {
      toast.error('Please select a data source and at least one field.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData([]);

    try {
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource: selectedDataSource,
          fields: selectedFields,
          // TODO: Add filters (e.g., dateRange, specific field filters)
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: 'Failed to generate report.' }));
        throw new Error(errorResult.error || `Error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setReportData(result.data);
        toast.success('Report generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to retrieve report data.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataSource, selectedFields]);
  
  const reportTableHeaders = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Settings2Icon className="mr-2 h-6 w-6" />
            Custom Report Generator
          </CardTitle>
          <CardDescription>
            Select a data source, choose fields, and apply filters to generate your custom report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="dataSourceSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Data Source
              </label>
              <Select
                value={selectedDataSource}
                onValueChange={(value) => setSelectedDataSource(value as DataSourceKey)}
              >
                <SelectTrigger id="dataSourceSelect">
                  <SelectValue placeholder="Select data source..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATA_SOURCES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Placeholder for Date Range Picker */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DateRangePicker />
            </div> */}
            
            <div className="md:col-span-1 flex items-end">
              <Button onClick={generateReport} disabled={isLoading || !selectedDataSource}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>

          {/* Field Selection */}
          {selectedDataSource && DATA_SOURCES[selectedDataSource] && (
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-lg font-medium">Select Fields for "{DATA_SOURCES[selectedDataSource].label}"</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {DATA_SOURCES[selectedDataSource].fields.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field}`}
                      checked={selectedFields.includes(field)}
                      onCheckedChange={(checked) => handleFieldChange(field, !!checked)}
                    />
                    <label htmlFor={`field-${field}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {field}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder for Filters */}
          {/* <div className="space-y-2 pt-4 border-t">
            <h3 className="text-lg font-medium">Filters</h3>
            <p className="text-sm text-muted-foreground">Filter options will appear based on selected data source and fields.</p>
          </div> */}
        </CardContent>
      </Card>

      {/* Report Results */}
      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error Generating Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {(reportData.length > 0 || isLoading) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Report Results</CardTitle>
            {reportData.length > 0 && !isLoading && (
              <Button variant="outline" size="sm" onClick={() => alert('CSV Export for custom report: TODO')}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && !reportData.length ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading report data...</p>
              </div>
            ) : reportData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportTableHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {reportTableHeaders.map(header => <TableCell key={`${rowIndex}-${header}`}>{String(row[header] ?? '')}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              !isLoading && <p className="text-muted-foreground">No data to display for the selected criteria.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
