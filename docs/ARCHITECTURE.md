# CodeMark Architecture Documentation

## Overview

CodeMark is a modern web application built with Next.js 16 that provides AI-powered code review capabilities. The architecture follows a client-server model with emphasis on performance, type safety, and user experience.

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Code Editor**: Monaco Editor (VS Code engine)
- **State Management**: Zustand
- **Icons**: Lucide React

### Backend/API
- **Runtime**: Node.js 18+
- **API Routes**: Next.js API Routes (App Router)
- **AI Integration**: OpenAI GPT-4 with streaming
- **HTTP Client**: Native fetch API

### Performance & Monitoring
- **Analytics**: Vercel Analytics
- **Web Vitals**: web-vitals library
- **Bundle Analysis**: @next/bundle-analyzer
- **Service Worker**: Custom PWA implementation
- **Caching**: Browser Cache API + LocalStorage

### Development Tools
- **Linting**: ESLint with Next.js config
- **Package Manager**: npm/pnpm
- **Build Tool**: Next.js (Turbopack/Webpack)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐              │
│  │  Monaco    │  │  Thread    │  │   Chat      │              │
│  │  Editor    │  │  List      │  │   Panel     │              │
│  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘              │
│        │                │                 │                      │
│        └────────────────┴─────────────────┘                     │
│                         │                                        │
│                    ┌────▼─────┐                                │
│                    │  Zustand │  (State Management)            │
│                    │  Store   │                                │
│                    └────┬─────┘                                │
│                         │                                        │
│        ┌────────────────┼────────────────┐                     │
│        │                │                │                      │
│   ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐              │
│   │LocalStorage│   │  Cache  │    │  Service │              │
│   │           │    │   API   │    │  Worker  │              │
│   └───────────┘    └──────────┘    └────┬─────┘              │
└───────────────────────────────────────────┼─────────────────────┘
                                            │
                    ┌───────────────────────▼───────────────────┐
                    │      Next.js API Routes (Server)          │
                    ├───────────────────────────────────────────┤
                    │                                           │
                    │  ┌────────────┐    ┌──────────────┐     │
                    │  │  /api/review│    │ /api/analytics│     │
                    │  │            │    │              │     │
                    │  └─────┬──────┘    └──────────────┘     │
                    │        │                                  │
                    │  ┌─────▼──────┐                          │
                    │  │  AI Service│                          │
                    │  │  (lib/ai)  │                          │
                    │  └─────┬──────┘                          │
                    └────────┼─────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   OpenAI API     │
                    │   (GPT-4)        │
                    └──────────────────┘
```

## Directory Structure

```
CodeMark/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── analytics/                # Analytics endpoints
│   │   │   ├── events/route.ts       # Event tracking
│   │   │   └── performance/route.ts  # Performance metrics
│   │   ├── chat/route.ts             # Legacy chat endpoint
│   │   ├── health/route.ts           # Health check
│   │   └── review/route.ts           # AI review endpoint
│   ├── error.tsx                     # Error page
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   ├── loading.tsx                   # Loading state
│   └── page.tsx                      # Home page
│
├── components/                       # React Components
│   ├── chat/                         # Thread management components
│   │   ├── thread-card.tsx           # Individual thread display
│   │   ├── thread-list.tsx           # Thread list with filters
│   │   └── thread-list-item.tsx      # List item component
│   ├── layout/                       # Layout components
│   │   └── chat-panel.tsx            # Chat panel container
│   ├── ui/                           # UI primitives (Radix)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── tabs.tsx
│   │   └── [other radix components]
│   ├── AppShell.tsx                  # Main app container
│   ├── ConfirmationModal.tsx         # Confirmation dialog
│   ├── ConnectionStatus.tsx          # Network status indicator
│   ├── DevToolsPanel.tsx             # Developer tools
│   ├── DevToolsWrapper.tsx           # DevTools container
│   ├── ErrorBoundary.tsx             # Error boundaries
│   ├── LoadingSkeleton.tsx           # Loading skeletons
│   ├── PerformanceMonitor.tsx        # Performance tracking
│   └── ServiceWorkerRegistration.tsx # SW registration
│
├── lib/                              # Utility Libraries
│   ├── ai/                           # AI service integration
│   │   └── openai.ts                 # OpenAI client wrapper
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-intersection-observer.ts
│   │   └── useOnlineStatus.ts
│   ├── monitoring/                   # Performance monitoring
│   │   └── performance.ts            # Core Web Vitals & metrics
│   ├── stores/                       # Zustand stores
│   │   └── reviewStore.ts            # Review state management
│   ├── types/                        # TypeScript types
│   │   └── review.ts                 # Review interfaces
│   ├── clientLogger.ts               # Client-side logging
│   ├── correlation.ts                # Request correlation IDs
│   ├── errors.ts                     # Error utilities
│   ├── logger.ts                     # Server-side logging
│   ├── selection.ts                  # Text selection utilities
│   ├── storage.ts                    # LocalStorage utilities
│   ├── toast.ts                      # Toast notifications
│   └── utils.ts                      # General utilities
│
├── public/                           # Static Assets
│   ├── sw.js                         # Service worker
│   ├── icon.svg                      # App icon
│   ├── icon-light-32x32.png
│   ├── icon-dark-32x32.png
│   └── apple-icon.png
│
├── docs/                             # Documentation
│   ├── ARCHITECTURE.md               # This file
│   └── TASK_LIST.md                  # Future development tasks
│
├── .env.example                      # Environment template
├── .eslintrc.json                    # ESLint configuration
├── next.config.ts                    # Next.js configuration
├── package.json                      # Dependencies
├── postcss.config.mjs                # PostCSS config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
└── README.md                         # Project documentation
```

## Data Flow

### Code Review Flow

1. **User Input**: User selects code in Monaco Editor
2. **State Update**: Selection stored in ReviewStore (Zustand)
3. **Thread Creation**: New thread created with selected code
4. **API Request**: POST to `/api/review` with code and prompt
5. **Streaming Response**: AI response streams back via SSE
6. **State Update**: ReviewStore updates with incoming messages
7. **UI Update**: React components re-render with new messages
8. **Persistence**: Thread saved to localStorage

### State Management Flow

```
User Action → Component Event Handler → Zustand Action → State Update → Component Re-render
                                            ↓
                                       localStorage
                                       (persistence)
```

### Performance Monitoring Flow

```
Page Load → PerformanceMonitor Init → Web Vitals Collection → Batch Metrics
                                                                     ↓
                                                          POST /api/analytics/performance
                                                                     ↓
                                                          Logger → Console/External Service
```

## Key Design Decisions

### 1. Client-Side State Management (Zustand)

**Why**: 
- Minimal boilerplate compared to Redux
- Excellent TypeScript support
- No Provider hell
- Built-in DevTools integration

**Trade-offs**:
- Limited middleware ecosystem
- Manual persistence layer needed

### 2. LocalStorage for Persistence

**Why**:
- No backend database required
- Instant access without network requests
- Privacy-friendly (data stays on device)
- Simple synchronous API

**Trade-offs**:
- 5-10MB storage limit
- No cross-device sync
- Requires manual serialization
- No transactions or queries

### 3. Monaco Editor with Lazy Loading

**Why**:
- Full VS Code editing experience
- Excellent syntax highlighting
- ~500KB bundle - needs code splitting

**Implementation**:
- Dynamic import with next/dynamic
- Separate webpack chunk with priority
- Loading skeleton for UX

### 4. Streaming AI Responses

**Why**:
- Perceived performance improvement
- Real-time feedback to users
- Better UX for long responses

**Implementation**:
- Server-Sent Events (SSE)
- ReadableStream with TextDecoder
- Progressive UI updates

### 5. Service Worker for Offline Support

**Why**:
- Progressive Web App capabilities
- Offline access to previously viewed code
- Faster subsequent loads

**Trade-offs**:
- Complexity in cache management
- Potential stale content issues
- Browser compatibility considerations

## Component Architecture

### Atomic Design Pattern

Components follow a modified Atomic Design structure:

- **Atoms**: `components/ui/` - Basic UI primitives (button, input)
- **Molecules**: `components/` - Composed components (ConfirmationModal)
- **Organisms**: `components/chat/` - Complex feature components (ThreadList)
- **Templates**: `components/layout/` - Page structure (ChatPanel)
- **Pages**: `app/` - Full pages with routing (page.tsx)

### Component Optimization

- **React.memo**: Applied to expensive components (ThreadList, ThreadCard)
- **useMemo**: For expensive computations (filtering, sorting)
- **useCallback**: For event handlers passed to children
- **Code Splitting**: Monaco Editor loaded on demand

## API Design

### RESTful Endpoints

- `GET /api/health` - Health check and service status
- `POST /api/review` - AI code review with streaming
- `POST /api/analytics/performance` - Performance metrics
- `POST /api/analytics/events` - Analytics events

### Response Formats

**Success (200)**:
```json
{
  "data": {...},
  "timestamp": 1234567890
}
```

**Error (4xx/5xx)**:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": 1234567890
}
```

**Streaming (text/event-stream)**:
```
data: {"type":"start","id":"123"}

data: {"type":"content","content":"AI response..."}

data: {"type":"done"}
```

## Security Considerations

### API Key Management
- Environment variables only
- Never exposed to client
- Server-side validation

### CORS & CSP
- Same-origin API calls
- No external script loading (except OpenAI)
- Content Security Policy headers

### Input Validation
- TypeScript type checking
- Runtime validation with Zod (planned)
- Sanitization of user input

### Rate Limiting
- Client-side debouncing
- Server-side rate limiting (planned)
- OpenAI API quota management

## Performance Optimizations

### Bundle Size
- Code splitting: Monaco Editor separate chunk
- Tree shaking: Unused code eliminated
- Vendor splitting: npm packages separated
- Max chunk size: 244KB target

### Runtime Performance
- React.memo for expensive renders
- Virtual scrolling for long lists (IntersectionObserver)
- Debounced search/filter operations
- Optimistic UI updates

### Network Performance
- Streaming responses reduce perceived latency
- Service worker caches static assets
- Resource hints (preconnect) for OpenAI API
- Compression (gzip/brotli) in production

### Monitoring
- Core Web Vitals tracking
- Long task detection (>50ms)
- Resource timing monitoring
- Custom performance marks

## Deployment Architecture

### Vercel Deployment

```
GitHub Push → Vercel Build → Deploy
                  ↓
           Build Optimizations:
           - Static optimization
           - Image optimization
           - Edge functions
           - CDN distribution
```

### Environment Layers
1. **Development**: Local with hot reload
2. **Preview**: Vercel preview deployments per PR
3. **Production**: Main branch auto-deploys

### CDN Strategy
- Static assets served from Vercel Edge Network
- Global distribution for low latency
- Automatic cache invalidation on deploy

## Future Architecture Improvements

### Planned Enhancements
1. **Backend Database**: PostgreSQL for multi-user support
2. **Authentication**: Clerk or Auth0 integration
3. **Real-time Collaboration**: WebSocket for shared reviews
4. **Advanced Caching**: Redis for API response caching
5. **Microservices**: Separate AI service deployment
6. **Testing**: E2E tests with Playwright
7. **Monitoring**: Sentry for error tracking
8. **Analytics**: PostHog for product analytics

### Scalability Considerations
- **Horizontal scaling**: Vercel auto-scales based on traffic
- **Database sharding**: When adding multi-tenancy
- **Queue system**: For batch AI processing
- **Edge compute**: Move more logic to edge functions

## Maintenance & Operations

### Logging Strategy
- **Client**: Console logs in dev, errors sent to analytics
- **Server**: Structured logging with correlation IDs
- **Production**: Integration with log aggregation service

### Error Handling
- Error boundaries at component tree boundaries
- Graceful degradation for offline mode
- User-friendly error messages
- Automatic error reporting to analytics

### Monitoring Checklist
- [ ] Core Web Vitals within targets
- [ ] API response times <2s p95
- [ ] Error rate <1%
- [ ] Bundle sizes <244KB
- [ ] Uptime >99.9%

---

*Last Updated: November 2024*
*Version: 1.0.0*
