# AIBOS Hybrid Windows Platform

A modern, multi-tenant operating system platform built with Deno, React, and Supabase.

## 🚀 Quick Start

1. **Navigate to the project:**
   ```bash
   cd aibos-hybrid-windows
   ```

2. **Start development server:**
   ```bash
   deno task dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8000`

## 📁 Project Structure

```
aibos_dino/
└── aibos-hybrid-windows/          # Main AIBOS application
    ├── api/                       # API endpoints
    ├── apps/                      # App store applications
    ├── docs/                      # Documentation
    ├── scripts/                   # Build and utility scripts
    ├── src/                       # Source code
    ├── supabase/                  # Database schema and migrations
    ├── main.ts                    # Application entry point
    └── deno.json                  # Deno configuration
```

## 🛠️ Available Tasks

### PowerShell (Recommended)
```powershell
# Navigate to the project
cd aibos-hybrid-windows

# Use the PowerShell wrapper (handles all syntax issues)
.\aibos.ps1 dev          # Start development server
.\aibos.ps1 build        # Build for production
.\aibos.ps1 cleanup      # Clean up workspace
.\aibos.ps1 validate     # Validate SSOT compliance
.\aibos.ps1 setup        # Setup Supabase database
.\aibos.ps1 status       # Show workspace status
```

### Direct Deno Commands
```bash
deno task dev          # Start development server
deno task build        # Build for production
deno task cleanup      # Clean up workspace
deno task validate     # Validate SSOT compliance
deno task setup        # Setup Supabase database
```

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Deno + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **State Management**: Zustand

## 📚 Documentation

See the `aibos-hybrid-windows/docs/` directory for detailed documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the architecture validation script
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. 