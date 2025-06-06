# DutyLeak - Import Duty Calculator

A comprehensive web application for calculating import duties, managing product classifications, and optimizing international trade costs.

## Features

- **Product Management**: Upload and manage product catalogs with automated HS code classification
- **Duty Calculation**: Calculate import duties and taxes for multiple countries
- **FBA Integration**: Amazon FBA fee calculations and optimization
- **Review Queue**: Manual review system for classification accuracy
- **Analytics & Reporting**: Comprehensive dashboards and export capabilities
- **Scenario Modeling**: Compare different import strategies
- **Batch Processing**: Handle large product catalogs efficiently

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **AI/ML**: OpenAI GPT-4, Anthropic Claude
- **File Processing**: CSV parsing and validation
- **Caching**: Redis (optional)

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- OpenAI API key (for AI classification)
- Anthropic API key (optional, for alternative AI)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd dutyleak-final
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
API_KEY_ENCRYPTION_SECRET=your_32_character_encryption_secret
OPENAI_API_KEY=sk-your_openai_api_key
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the database migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize and link to your project
supabase init
supabase link --project-ref your-project-ref

# Push database schema
supabase db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── auth/             # Authentication pages
│   └── globals.css       # Global styles
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   └── charts/           # Chart components
├── lib/                  # Utility libraries
│   ├── supabase/         # Supabase client and utilities
│   ├── ai/               # AI service integrations
│   └── utils/            # General utilities
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── middleware.ts         # Next.js middleware
```

## Key Features

### Product Management
- CSV upload and validation
- Automated HS code classification using AI
- Manual classification override
- Product catalog management

### Duty Calculation
- Multi-country duty rate lookup
- Tax calculation (VAT, GST, etc.)
- Shipping cost estimation
- Total landed cost calculation

### Review Queue
- Manual review workflow
- Classification confidence scoring
- Bulk approval/rejection
- Audit trail

### Analytics
- Cost analysis dashboards
- Classification accuracy metrics
- Export reports (CSV, PDF)
- Historical trend analysis

## API Documentation

### Core Endpoints

- `POST /api/products/upload` - Upload product CSV
- `GET /api/products` - List products
- `POST /api/classification/classify` - Classify product
- `GET /api/duty/calculate` - Calculate duties
- `GET /api/dashboard/stats` - Dashboard statistics

### Authentication

All API endpoints require authentication via Supabase Auth. Include the session token in the Authorization header:

```
Authorization: Bearer <session-token>
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Feature Flags

Control feature availability via environment variables:

- `ENABLE_ANALYTICS=true` - Enable analytics features
- `ENABLE_BATCH_PROCESSING=true` - Enable batch operations
- `ENABLE_NOTIFICATIONS=true` - Enable email notifications

## Development

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Database

```bash
# Generate types from database
npm run db:types

# Reset database
supabase db reset

# Create migration
supabase migration new migration_name
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Docker

```bash
# Build image
docker build -t dutyleak .

# Run container
docker run -p 3000:3000 --env-file .env.local dutyleak
```

## Troubleshooting

### Common Issues

1. **Authentication loops**: Check Supabase configuration and RLS policies
2. **TypeScript errors**: Run `npm run type-check` for detailed errors
3. **Database connection**: Verify Supabase credentials and network access
4. **API rate limits**: Check OpenAI/Anthropic usage and limits

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards

- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Update documentation

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Webhook integrations
- [ ] Advanced caching strategies