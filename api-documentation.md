# DutyLeak API Documentation

This document provides comprehensive documentation for the DutyLeak API, which replaces the previous n8n workflow with a robust in-app job system and custom backend.

## Base URL

All API endpoints are relative to the base URL of your deployment:

```
https://your-deployment-url.com/api
```

## Authentication

All API endpoints require authentication. The API uses Supabase Auth with JWT tokens for authentication. Include the authentication cookie in all requests.

### Error Responses

All endpoints may return the following error responses:

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

## Core API Endpoints

### Health Check

```
GET /health
```

Checks the health of the API and its dependencies.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-05-29T16:30:00.000Z",
  "database": "connected",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  },
  "externalApiStatus": {
    "zonos": "configured",
    "openai": "configured",
    "taric": "simulated",
    "usitc": "simulated"
  }
}
```

### Classify HS Code

```
POST /core/classify-hs
```

Classifies a product using Zonos API and/or OpenAI to determine the appropriate HS code.

**Request Body**:
```json
{
  "productId": "product-uuid",
  "productName": "Laptop Computer",
  "productDescription": "Portable computing device with 16GB RAM and 512GB SSD",
  "imageUrl": "https://example.com/laptop.jpg",
  "existingHsCode": "847130"
}
```

**Response**:
```json
{
  "success": true,
  "classificationId": "classification-uuid",
  "hsCode": "847130",
  "confidenceScore": 0.85,
  "source": "zonos"
}
```

### Lookup Duty Rates

```
POST /core/lookup-duty-rates
```

Looks up duty rates for a specific HS code and destination country.

**Request Body**:
```json
{
  "hsCode": "847130",
  "destinationCountry": "US",
  "originCountry": "CN",
  "classificationId": "classification-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "rates": [
    {
      "dutyPercentage": 0,
      "vatPercentage": 0,
      "effectiveDate": "2025-01-01",
      "expiryDate": null
    }
  ],
  "source": "usitc"
}
```

### Calculate Landed Cost

```
POST /core/calculate-landed-cost
```

Calculates the landed cost for a product including duty and taxes.

**Request Body**:
```json
{
  "productId": "product-uuid",
  "destinationCountry": "US",
  "classificationId": "classification-uuid",
  "productValue": 1000,
  "shippingCost": 100,
  "insuranceCost": 50
}
```

**Response**:
```json
{
  "success": true,
  "landedCostDetails": {
    "dutyAmount": 57.5,
    "vatAmount": 0,
    "totalLandedCost": 1207.5,
    "effectiveDutyRate": 5.75,
    "breakdown": {
      "productValue": 1000,
      "shippingCost": 100,
      "insuranceCost": 50,
      "dutyableValue": 1150,
      "dutyAmount": 57.5,
      "vatableValue": 1207.5,
      "vatAmount": 0
    }
  },
  "calculationId": "calculation-uuid"
}
```

## Job System API Endpoints

### Create Job

```
POST /jobs
```

Creates a new job in the job system.

**Request Body**:
```json
{
  "type": "batch_classification",
  "parameters": {
    "productIds": ["product-uuid-1", "product-uuid-2"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job-uuid"
}
```

### List Jobs

```
GET /jobs?limit=10&offset=0&status=pending&type=batch_classification
```

Lists jobs with optional filtering.

**Query Parameters**:
- `limit`: Maximum number of jobs to return (default: 10)
- `offset`: Offset for pagination (default: 0)
- `status`: Filter by job status (optional)
- `type`: Filter by job type (optional)

**Response**:
```json
{
  "jobs": [
    {
      "id": "job-uuid",
      "type": "batch_classification",
      "status": "pending",
      "progress": 0,
      "created_at": "2025-05-29T16:00:00.000Z",
      "started_at": null,
      "completed_at": null
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Get Job Details

```
GET /jobs/{jobId}
```

Gets detailed information about a specific job.

**Response**:
```json
{
  "job": {
    "id": "job-uuid",
    "type": "batch_classification",
    "status": "running",
    "progress": 50,
    "parameters": {
      "productIds": ["product-uuid-1", "product-uuid-2"]
    },
    "error": null,
    "created_at": "2025-05-29T16:00:00.000Z",
    "started_at": "2025-05-29T16:01:00.000Z",
    "completed_at": null
  },
  "logs": [
    {
      "id": "log-uuid",
      "level": "info",
      "message": "Job started",
      "metadata": {},
      "created_at": "2025-05-29T16:01:00.000Z"
    }
  ],
  "relatedEntities": [
    {
      "entity_type": "product",
      "entity_id": "product-uuid-1"
    }
  ]
}
```

### Cancel Job

```
POST /jobs/{jobId}/cancel
```

Cancels a running or pending job.

**Response**:
```json
{
  "success": true,
  "message": "Job canceled successfully"
}
```

### Rerun Job

```
POST /jobs/{jobId}/rerun
```

Creates a new job with the same parameters as a failed or canceled job.

**Response**:
```json
{
  "success": true,
  "message": "Job rerun initiated successfully",
  "newJobId": "new-job-uuid"
}
```

## Cron Job Triggers

These endpoints are triggered by Vercel Cron jobs and require a special `CRON_SECRET` header for authentication.

### Trigger SP-API Export

```
POST /cron/trigger-spapi-export
```

Triggers a job to export product data from Amazon SP-API.

### Trigger Batch Classification

```
POST /cron/trigger-batch-classification
```

Triggers a job to classify products that don't have an active classification.

### Health Check

```
POST /cron/health-check
```

Performs a health check of all system components and sends alerts if issues are found.

## Database Schema

The API interacts with the following database tables:

- `workspaces`: Organizations/workspaces
- `workspace_users`: Junction table for users and workspaces
- `profiles`: User profiles extending auth.users
- `products`: Product catalog
- `classifications`: HS code classifications for products
- `duty_rates`: Duty rates for classifications and countries
- `savings_ledger`: Savings from duty optimizations
- `jobs`: Background jobs
- `job_logs`: Logs for job execution
- `job_related_entities`: Links jobs to related entities

## External API Integrations

The API integrates with the following external services:

- **Zonos API**: For HS code classification
- **OpenAI API**: For AI-assisted classification
- **TARIC API**: For EU duty rates
- **USITC DataWeb API**: For US duty rates
- **Amazon SP-API**: For product catalog import

## Deployment

The API is designed to be deployed on Vercel with a Supabase backend. See the deployment guide for detailed instructions.
