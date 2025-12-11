# CodeMark - AI Code Review Assistant

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

CodeMark is a modern, AI-powered code review assistant that provides block-level code analysis and feedback. Built with Next.js 16, React 19, and OpenAI's GPT models, it offers an intuitive interface for reviewing code with intelligent suggestions and explanations.

## Features

- **Block-Level Code Review**: Select specific code blocks for targeted AI review
- **AI-Powered Analysis**: Leverages OpenAI's GPT-4 for intelligent code feedback
- **Real-Time Streaming**: See AI responses as they're generated
- **Thread Management**: Organize multiple review threads with filtering and sorting
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Performance Optimized**: Code splitting, React optimizations, and Core Web Vitals monitoring
- **Offline Support**: Service worker for cached content access
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0 or higher
- **npm** or **pnpm**: Latest version recommended
- **OpenAI API Key**: Required for AI code review functionality

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd CodeMark
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the project root (see [Environment Configuration](#environment-configuration) below):
   ```bash
   cp .env.example .env
   ```

4. **Add your OpenAI API key** to the `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Required: OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Development Settings
NEXT_PUBLIC_ENABLE_DEVTOOLS=true          # Enable developer tools panel
NEXT_PUBLIC_ENABLE_ANALYTICS=false        # Enable analytics in development
NEXT_PUBLIC_ENABLE_SW=false               # Enable service worker in development

# Optional: Performance Monitoring
ANALYZE=false                             # Enable bundle analyzer on build
```

### Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for GPT model access | - |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | No | Show DevTools panel for debugging | `false` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | No | Enable performance analytics | `false` in dev, `true` in prod |
| `NEXT_PUBLIC_ENABLE_SW` | No | Enable service worker | `false` in dev, `true` in prod |
| `ANALYZE` | No | Generate bundle analysis on build | `false` |

## Usage

### Development Server

Start the development server:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Code Review Workflow

1. **Paste or write code** in the Monaco editor (left panel)
2. **Select a code block** to review
3. **Create a review thread** by clicking the review button or using the context menu
4. **Ask questions** or request specific types of analysis in the chat
5. **Receive AI feedback** with detailed explanations and suggestions
6. **Manage threads** in the right panel - filter, sort, resolve, or delete as needed

### Building for Production

Build the optimized production bundle:

```bash
npm run build
npm run start
```

### Bundle Analysis

Analyze the production bundle size and composition:

```bash
npm run analyze
```

This generates interactive HTML reports in `.next/analyze/` directory showing:
- Client-side bundle breakdown
- Server-side bundle composition
- Chunk sizes and dependencies

## AI Transparency & Data Handling

### AI Model Usage

CodeMark uses **OpenAI's GPT models** for code analysis:
- **Model**: GPT-4 (configurable)
- **Purpose**: Code review, bug detection, explanation, and improvement suggestions
- **Processing**: Code is sent to OpenAI's API for analysis

### Data Handling

- **Code Storage**: All code and review threads are stored **locally in your browser** using localStorage
- **No Backend Database**: CodeMark does not store your code on any server
- **API Communication**: Code is transmitted to OpenAI's API only during active review requests
- **Privacy**: Review history remains on your device unless explicitly shared

### OpenAI Data Usage Policy

By using CodeMark, your code snippets are subject to OpenAI's [API Data Usage Policy](https://openai.com/policies/api-data-usage-policies):
- API data is not used to train OpenAI models (as of March 2023)
- Data may be retained for 30 days for abuse monitoring
- Enterprise customers can opt into zero data retention

**Recommendation**: Do not submit proprietary, confidential, or sensitive code without proper authorization and understanding of data handling policies.

## Architecture

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI GPT-4 with streaming
- **Editor**: Monaco Editor (VS Code engine)
- **State Management**: Zustand
- **UI Components**: Radix UI primitives
- **Analytics**: Vercel Analytics, web-vitals

### Project Structure

```
CodeMark/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── chat/                 # Legacy chat API
│   │   ├── review/               # AI code review endpoint
│   │   └── analytics/            # Performance monitoring endpoints
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── chat/                     # Thread management UI
│   ├── layout/                   # Layout components
│   ├── ui/                       # Reusable UI components (Radix)
│   ├── AppShell.tsx             # Main application shell
│   └── ErrorBoundary.tsx        # Error handling
├── lib/                         # Utility libraries
│   ├── ai/                      # AI service integration
│   ├── hooks/                   # Custom React hooks
│   ├── monitoring/              # Performance monitoring
│   ├── stores/                  # Zustand state stores
│   ├── logger.ts                # Structured logging
│   └── storage.ts               # LocalStorage utilities
├── public/                      # Static assets
│   └── sw.js                    # Service worker
└── .env                         # Environment variables
```

### Key Components

- **AppShell**: Main application container with resizable panels
- **MonacoEditorWrapper**: Code editor with syntax highlighting (lazy-loaded)
- **ChatPanel**: Thread management and AI conversation interface
- **ThreadList**: Filterable, sortable list of review threads
- **ReviewStore**: Zustand store for thread state management

## Development Features

### DevTools Panel

Enable the developer tools panel for debugging:

```env
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
```

Features:
- **Performance Metrics**: Real-time Core Web Vitals monitoring
- **Storage Inspector**: View localStorage contents
- **Network Monitor**: Track API requests and responses
- **State Debugger**: Inspect Zustand store state

### Performance Monitoring

CodeMark includes comprehensive performance monitoring:

- **Core Web Vitals**: LCP, FID, INP, CLS, FCP, TTFB tracking
- **Long Task Detection**: Identifies tasks >50ms
- **Resource Timing**: Monitors slow/large resources
- **Custom Metrics**: Thread creation, AI response time, editor load
- **Bundle Analysis**: Webpack bundle analyzer integration

View metrics in development console or integrate with analytics services in production.

## Deployment

### Deploying to Vercel

1. **Push your code** to GitHub, GitLab, or Bitbucket

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Vercel auto-detects Next.js configuration

3. **Add environment variables**:
   - Go to Project Settings → Environment Variables
   - Add `OPENAI_API_KEY` and any optional variables
   - Deploy

4. **Domain configuration**:
   - Vercel provides a `.vercel.app` domain automatically
   - Add custom domain in Project Settings → Domains

### Environment Variables for Production

Required for Vercel deployment:
```env
OPENAI_API_KEY=your_production_api_key
```

Optional for production:
```env
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Health Check

Monitor deployment health at:
```
https://your-domain.com/api/health
```

Returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": 1234567890,
  "checks": {
    "openai": "connected"
  }
}
```

## Troubleshooting

### Common Issues

**"OpenAI API Error: 401 Unauthorized"**
- **Cause**: Invalid or missing API key
- **Solution**: Verify `OPENAI_API_KEY` in `.env` file
- **Check**: Ensure the key is valid at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**"Failed to load Monaco Editor"**
- **Cause**: Network issues or CDN problems
- **Solution**: Clear browser cache and reload
- **Alternative**: Check browser console for specific errors

**"Threads not saving"**
- **Cause**: LocalStorage quota exceeded or disabled
- **Solution**: Clear old threads or enable cookies/storage in browser settings
- **Limit**: Most browsers allow 5-10MB per origin

**"Slow performance with many threads"**
- **Cause**: Too many threads in memory
- **Solution**: Resolve or delete old threads
- **Optimization**: Enable production mode for better performance

**Build errors**
- **Cause**: Missing dependencies or Node version mismatch
- **Solution**:
  ```bash
  rm -rf node_modules package-lock.json .next
  npm install
  npm run build
  ```

### Development Mode Issues

**Service worker not updating**
- Unregister in DevTools → Application → Service Workers
- Hard refresh (Cmd/Ctrl + Shift + R)

**Bundle analyzer not working with Turbopack**
- Use webpack mode: `npm run build -- --webpack`
- Turbopack support coming in future Next.js versions

## Performance

CodeMark is optimized for production:

- **Code Splitting**: Monaco Editor loads lazily (~500KB reduction)
- **Bundle Size**: All chunks <244KB (webpack configuration)
- **React Optimizations**: Memoization for expensive components (30%+ render improvement)
- **Caching**: Service worker for offline access to static assets
- **Monitoring**: Real-time Core Web Vitals tracking

### Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | <2.5s | Largest Contentful Paint |
| FID | <100ms | First Input Delay |
| CLS | <0.1 | Cumulative Layout Shift |
| Bundle Size | <244KB | Per chunk maximum |
| Initial Load | <3s | Time to interactive |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use conventional commits
- Add tests for new features
- Update documentation as needed
- Ensure all builds pass before submitting PR

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/) by Vercel
- Powered by [OpenAI](https://openai.com/) GPT models
- Editor by [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting guide above

---

**Note**: This is an educational/development tool. Always review AI suggestions carefully and ensure compliance with your organization's code review policies and data handling requirements.
