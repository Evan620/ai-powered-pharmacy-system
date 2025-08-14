# 🏥 AI-Powered Pharmacy System

A comprehensive, modern pharmacy management system built with Next.js, TypeScript, and Supabase. Features intelligent inventory management, point-of-sale operations, and AI-driven analytics for optimal pharmacy operations.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.55.0-green)

## ✨ Features

### 🛒 Point of Sale (POS)
- **Fast Product Search**: Search by SKU, generic name, or brand
- **Barcode Scanning**: Support for USB and camera-based scanners
- **Offline Sales**: Continue selling even without internet connection
- **Multiple Payment Methods**: Cash, M-Pesa, Card, and mixed payments
- **Receipt Printing**: Thermal printer support (58mm/80mm)
- **Cart Management**: Hold transactions, apply discounts, edit quantities

### 📦 Inventory Management
- **Batch-Level Tracking**: FEFO (First Expired, First Out) allocation
- **Real-Time Stock Updates**: Automatic stock adjustments on sales
- **Expiry Monitoring**: AI-powered expiry alerts and recommendations
- **Stock Movements**: Complete audit trail of all inventory changes
- **Low Stock Alerts**: Automated reorder point notifications
- **Supplier Management**: Track suppliers, lead times, and minimum orders

### 📊 Analytics & Reporting
- **Sales Analytics**: Daily, weekly, monthly revenue reports
- **Inventory Reports**: Stock on hand, low stock, expiry reports
- **Top Selling Products**: Data-driven insights on product performance
- **Financial Dashboard**: Revenue trends, profit margins, expense tracking
- **Export Capabilities**: CSV and PDF export for all reports

### 🤖 AI-Powered Features
- **Expiry Risk Prediction**: Identify products likely to expire
- **Reorder Suggestions**: Intelligent stock replenishment recommendations
- **Sales Forecasting**: Predict future demand patterns
- **Anomaly Detection**: Identify unusual sales patterns or discrepancies

### 🔐 Security & Compliance
- **Role-Based Access Control**: Owner, Manager, Cashier roles
- **Row-Level Security**: Data isolation per pharmacy
- **Audit Logging**: Complete trail of all system actions
- **Data Privacy**: GDPR/Kenya DPA compliant

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Evan620/ai-powered-pharmacy-system.git
   cd ai-powered-pharmacy-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd apps/web && npm install
   ```

3. **Set up Supabase**
   ```bash
   # Create a new Supabase project at https://supabase.com
   # Copy your project URL and anon key
   ```

4. **Configure environment variables**
   ```bash
   cd apps/web
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

5. **Run database migrations**
   ```bash
   # Install Supabase CLI: https://supabase.com/docs/guides/cli
   supabase db push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
ai-powered-pharmacy-system/
├── apps/web/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts (Auth, Toast)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions and configs
│   │   └── styles/          # Global CSS and Tailwind
│   ├── public/              # Static assets
│   └── package.json
├── supabase/
│   └── migrations/          # Database schema and migrations
├── docs/                    # Project documentation
├── scripts/                 # Utility scripts
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Charts**: Recharts
- **Icons**: Heroicons
- **Font**: Inter

### Backend
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Edge Functions**: Supabase Functions

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Git Hooks**: Husky (optional)

## 📱 Key Screens

### Dashboard
- Revenue metrics and trends
- Top-selling products
- Low stock and expiry alerts
- Quick action buttons

### Point of Sale
- Product search and scanning
- Shopping cart with line items
- Payment processing
- Receipt generation

### Inventory
- **Products**: Manage product catalog
- **Batches**: Track batch numbers and expiry dates
- **Adjustments**: Manual stock corrections
- **Movements**: Complete audit trail

### Reports
- Sales reports (daily, weekly, monthly)
- Inventory reports (stock levels, expiry)
- Financial reports (revenue, profit margins)
- Export functionality (CSV, PDF)

## 🔧 Configuration

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Database Setup
The system uses Supabase with PostgreSQL. Key tables include:
- `pharmacies` - Pharmacy information
- `profiles` - User profiles and roles
- `products` - Product catalog
- `batches` - Inventory batches with expiry tracking
- `sales` - Sales transactions
- `sale_items` - Individual sale line items
- `suppliers` - Supplier information

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/Evan620/ai-powered-pharmacy-system/issues)
- 💬 [Discussions](https://github.com/Evan620/ai-powered-pharmacy-system/discussions)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- UI components inspired by modern design systems
- Icons by [Heroicons](https://heroicons.com/)

---

**Made with ❤️ for pharmacies worldwide**

<!-- Deployment trigger -->
