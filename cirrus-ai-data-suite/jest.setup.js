import '@testing-library/jest-dom'
import 'reflect-metadata'

// Add Jest DOM matchers
global.expect.extend({});

// Add TextDecoder and TextEncoder polyfills for Node.js
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js image component
jest.mock('next/image', () => {
  return function MockedImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock global fetch
global.fetch = jest.fn()

// Mock Next.js Request and Response for API routes
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => {
    const mockRequest = {
      url,
      method: init?.method || 'GET',
      headers: new Headers(init?.headers || {}),
      body: init?.body,
      json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
      text: jest.fn().mockResolvedValue(init?.body || ''),
      nextUrl: {
        searchParams: new URLSearchParams(url?.split('?')[1] || ''),
      },
    };
    return mockRequest;
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => ({
      json: jest.fn().mockResolvedValue(data),
      status: init?.status || 200,
      headers: new Headers(init?.headers || {}),
    })),
  },
}))

// Mock PDF.js
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn(() => Promise.resolve({
        getTextContent: jest.fn(() => Promise.resolve({
          items: [
            { str: 'Mocked PDF content', transform: [1, 0, 0, 1, 0, 0], width: 100 }
          ]
        }))
      }))
    })
  }))
}))

// Mock TypeORM decorators and classes
jest.mock('typeorm', () => ({
  Entity: () => () => {},
  PrimaryColumn: () => () => {},
  PrimaryGeneratedColumn: () => () => {},
  Column: () => () => {},
  CreateDateColumn: () => () => {},
  UpdateDateColumn: () => () => {},
  Index: () => () => {},
  ManyToOne: () => () => {},
  JoinColumn: () => () => {},
  OneToMany: () => () => {},
  DataSource: jest.fn(() => ({
    initialize: jest.fn(),
    synchronize: jest.fn(),
    query: jest.fn(),
    isInitialized: true,
    driver: {},
    options: { type: 'postgres' },
    getRepository: jest.fn(() => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    })),
  })),
  Repository: jest.fn(() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  })),
  DefaultNamingStrategy: class {
    tableName(targetName, userSpecifiedName) {
      return userSpecifiedName || targetName;
    }
    columnName(propertyName, customName, embeddedPrefixes) {
      return customName || propertyName;
    }
  },
  NamingStrategyInterface: class {},
  QueryRunner: class {
    query() { return Promise.resolve(); }
    release() { return Promise.resolve(); }
  },
}))

// Database connection will be mocked in individual tests that need it

// Mock EventSource for SSE
global.EventSource = jest.fn().mockImplementation((url) => ({
  url,
  readyState: 0,
  withCredentials: false,
  onopen: null,
  onmessage: null,
  onerror: null,
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.ML_DETECTION_ENABLED = 'true'
process.env.ML_PROVIDER = 'simulated'