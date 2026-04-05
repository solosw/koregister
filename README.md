# Kiro Account Manager

A desktop application for managing Kiro accounts, usage, and subscriptions with integrated temporary email functionality.

## Overview

Kiro Account Manager is an Electron-based desktop application that helps users manage their Kiro accounts, track usage, handle subscriptions, and includes built-in temporary email functionality for testing and verification purposes.

## Features

- 📧 **Temporary Email Integration**: Create and manage disposable email addresses for account verification
- 👥 **Account Management**: Track and manage multiple Kiro accounts
- 📊 **Usage Monitoring**: View account usage statistics and limits
- 💳 **Subscription Handling**: Manage subscription plans and billing
- 🔐 **Secure Storage**: Credentials stored securely using Electron Store
- 🚀 **Auto Updates**: Automatic updates via Electron Updater
- 💻 **Cross-platform**: Available for Windows, macOS, and Linux

## Technology Stack

- **Framework**: Electron.js
- **UI Library**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Build Tool**: Electron Vite
- **Packaging**: Electron Builder
- **API Communication**: RESTful API integration

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd kiro-account-manager

# Install dependencies
npm install
# or
pnpm install
```

## Development

```bash
# Start the application in development mode
npm run dev
# or
pnpm dev

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck
```

## Building for Production

```bash
# Build for all platforms
npm run build

# Build for specific platforms
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux

# Create unpacked build (for testing)
npm run build:unpack
```

## API Documentation

The application includes integration with a temporary email service. For detailed API documentation, please refer to [API使用文档.md](API使用文档.md).

### Key API Endpoints

- **POST** `/api/mailbox/create` - Create a temporary email address
- **GET** `/api/mailbox/domains` - Get available email domains
- **GET** `/api/mailbox/:address` - Get mailbox information
- **DELETE** `/api/mailbox/:address` - Delete a mailbox
- **GET** `/api/emails/:address` - Get emails for an address (paginated)
- **GET** `/api/emails/:address/latest` - Get the latest email
- **GET** `/api/email/:id` - Get email details
- **DELETE** `/api/email/:id` - Delete an email
- **PATCH** `/api/email/:id/read` - Mark email as read

## Project Structure

```
kiro-account-manager/
├── src/                    # Source code
│   ├── main/              # Electron main process
│   ├── preload/           # Preload scripts
│   └── renderer/          # React renderer process
├── resources/             # Application resources (icons, etc.)
├── build/                 # Build outputs
├── out/                   # Compiled outputs
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── package.json           # Project configuration
├── electron.vite.config.ts # Electron Vite configuration
├── electron-builder.yml   # Electron Builder configuration
└── tsconfig*.json         # TypeScript configurations
```

## Configuration

### Environment Variables

The application can be configured using environment variables:

- `KIRO_API_URL`: Base URL for the Kiro API (default: `http://localhost:8080/api`)
- `TEMP_MAIL_SERVER_URL`: URL for the temporary email service

### Security

- Access tokens and sensitive data are encrypted and stored using Electron Store
- All API communications should be conducted over HTTPS in production
- The temporary email service currently does not implement authentication on endpoints (for local development only)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- State management with [Zustand](https://zustand-demo.pmndrs.org/)
- Icons by [Lucide](https://lucide.dev/)