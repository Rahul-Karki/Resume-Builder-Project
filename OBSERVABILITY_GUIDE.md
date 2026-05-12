# Observability Features Guide

This document outlines all the observability features implemented in the Resume Builder project to help with monitoring, debugging, and understanding system behavior.

## Overview

The observability system includes four main components:
1. **Logging System** - Centralized logging with different levels
2. **Performance Monitoring** - API call timing and system metrics
3. **Error Tracking** - Comprehensive error capture and user feedback
4. **AI Credits Management** - Usage tracking and alerts

## 1. Logging System (`/frontend/src/utils/logger.ts`)

### Purpose
- Centralized logging for all application events
- Debugging and troubleshooting
- Audit trail for user actions
- Performance analysis

### Features
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Automatic Error Capture**: Global error handlers for unhandled errors
- **Session Tracking**: Unique session IDs for debugging
- **Local Storage**: Logs stored locally for analysis
- **Console Output**: Formatted console output in development
- **Remote Logging**: Ready for production logging services

### Usage Examples
```typescript
import { logger } from '@/utils/logger';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.warn('Low disk space', { available: '2GB' });
logger.error('API call failed', { endpoint: '/api/users', status: 500 });

// Specialized logging
logger.logApiRequest('POST', '/api/resume', 200, 1500);
logger.logUserAction('Resume Downloaded', { format: 'PDF' });
logger.logPerformance('Page Load', 1200);
```

### Log Structure
```typescript
{
  timestamp: "2024-01-01T12:00:00.000Z",
  level: 1, // 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
  message: "User action completed",
  context: { userId: "123", action: "download" },
  userId?: "123",
  sessionId: "session_1234567890_abc123"
}
```

## 2. Performance Monitoring (`/frontend/src/utils/performance.ts`)

### Purpose
- Track API response times
- Monitor component render performance
- Identify performance bottlenecks
- Core Web Vitals monitoring

### Features
- **API Call Timing**: Automatic measurement of all API calls
- **Component Performance**: React render time tracking
- **Page Load Metrics**: Navigation timing analysis
- **Performance Summaries**: Statistics and averages
- **Custom Metrics**: Add your own performance measurements

### Usage Examples
```typescript
import { performanceMonitor, usePerformanceMonitor } from '@/utils/performance';

// Manual timing
performanceMonitor.startTimer('custom-operation');
// ... do work
const duration = performanceMonitor.endTimer('custom-operation');

// Measure API calls (automatically done in api.ts)
const result = await performanceMonitor.measureApiCall(
  'getUserData',
  () => api.get('/user'),
  { userId: '123' }
);

// React component monitoring
function MyComponent() {
  usePerformanceMonitor('MyComponent');
  // ... component logic
}

// Higher-order component
const MonitoredComponent = withPerformanceMonitor(MyComponent, 'EnhancedComponent');
```

### Metrics Tracked
- **API Response Times**: All API calls with success/failure status
- **Page Load Times**: DNS lookup, TCP connect, server response, DOM load
- **Component Render Times**: React component performance
- **Custom Metrics**: Any application-specific timing

## 3. Error Tracking (`/frontend/src/utils/errorTracking.ts`)

### Purpose
- Comprehensive error capture and categorization
- User feedback collection
- Error resolution tracking
- Debugging information preservation

### Features
- **Automatic Error Capture**: Global error handlers
- **API Error Tracking**: Failed API request logging
- **Error Categorization**: By type and severity
- **User Feedback**: Allow users to report if errors were helpful
- **Error Resolution**: Track which errors have been resolved
- **React Error Boundary**: Component-level error handling

### Usage Examples
```typescript
import { errorTracker, useErrorTracker, ErrorBoundary } from '@/utils/errorTracking';

// Manual error tracking
const errorId = errorTracker.trackError('Custom operation failed', error, {
  operation: 'data-processing',
  inputSize: 1000
});

// User error tracking
const userErrorId = errorTracker.trackUserError('Invalid input format', {
  field: 'email',
  value: 'invalid-email'
});

// React Error Boundary
<ErrorBoundary fallback={CustomErrorFallback}>
  <MyComponent />
</ErrorBoundary>

// Hook usage
function MyComponent() {
  const { errors, trackError, addFeedback } = useErrorTracker();
  
  const handleError = () => {
    const errorId = trackError('Something went wrong', new Error('details'));
    // ... handle error
  };
}
```

### Error Types
- **React Errors**: Component rendering errors
- **API Errors**: Failed HTTP requests
- **User Errors**: Validation or user input errors
- **System Errors**: Unhandled JavaScript errors

## 4. AI Credits Management (`/frontend/src/utils/aiCredits.ts`)

### Purpose
- Track AI feature usage and costs
- Prevent overspending with credit limits
- Alert users when credits are low
- Provide usage analytics

### Features
- **Credit Tracking**: Real-time credit balance
- **Usage Estimation**: Predict costs before operations
- **Automated Alerts**: Low credit and usage spike notifications
- **Usage Analytics**: Detailed usage history and statistics
- **Plan Management**: Support for different subscription tiers
- **Cost Prevention**: Block operations when insufficient credits

### Usage Examples
```typescript
import { aiCreditsManager, useAICredits } from '@/utils/aiCredits';

// Hook usage (recommended)
function MyComponent() {
  const { 
    credits, 
    plan, 
    alerts, 
    recordUsage, 
    canAfford, 
    estimateCredits 
  } = useAICredits();
  
  const handleAIOperation = async () => {
    if (!canAfford('improve-text', text.length)) {
      alert('Insufficient credits!');
      return;
    }
    
    try {
      await aiOperation();
      await recordUsage('improve-text', { textLength: text.length });
    } catch (error) {
      // Error handling
    }
  };
}

// Direct manager usage
const cost = aiCreditsManager.estimateCredits('ats-analysis');
if (aiCreditsManager.canAfford('ats-analysis')) {
  await aiCreditsManager.recordUsage('ats-analysis', { resumeId });
}
```

### Credit Operations
- **improve-text**: 5 credits base cost
- **check-grammar**: 3 credits base cost  
- **enhance-bullet**: 4 credits base cost
- **ats-analysis**: 10 credits base cost

### Alert Types
- **Low Credits**: Warning when credits ≤ 10
- **Out of Credits**: Critical when credits = 0
- **Usage Spike**: Alert when >50 credits used in 1 hour

## 5. Observability Dashboard (`/frontend/src/components/builder/ObservabilityDashboard.tsx`)

### Purpose
- Centralized interface for all observability data
- Real-time monitoring and debugging
- Data export and management
- Alert management

### Features
- **Real-time Logs**: View system logs with filtering
- **Performance Metrics**: API timing and system performance
- **Error Management**: View errors and mark as resolved
- **Credits Overview**: Current balance, usage history, and alerts
- **Data Export**: Download logs, errors, metrics, and credits data
- **Alert Management**: Acknowledge and manage system alerts

### Access
- Click the activity icon (📊) in the bottom-right corner of the resume builder
- Badge shows number of unacknowledged alerts
- Floating button for quick access

## 6. Integration with API Services

All API calls in `/frontend/src/services/api.ts` are automatically enhanced with:
- **Credit Checking**: Pre-validation of sufficient credits
- **Performance Monitoring**: Automatic timing measurement
- **Error Tracking**: Comprehensive error capture
- **Logging**: Detailed request/response logging

### Example API Call Flow
1. **Credit Check**: Verify sufficient credits before request
2. **Performance Timer**: Start timing measurement
3. **Logging**: Log request initiation
4. **API Request**: Execute the actual HTTP request
5. **Success Handling**: Record usage, log success, stop timer
6. **Error Handling**: Record failed usage, track error, log failure

## 7. AI Credits - When Will They Run Out?

### Monitoring Your Credits
1. **Observability Dashboard**: Check the "AI Credits" tab for current balance
2. **Real-time Alerts**: Get notified when credits are low (≤10) or depleted
3. **Usage History**: View detailed history of all credit usage
4. **Usage Analytics**: See which operations consume the most credits

### Credit Estimation
Before any AI operation, the system estimates the cost:
```typescript
const cost = aiCreditsManager.estimateCredits('improve-text', text.length);
const canAfford = aiCreditsManager.canAfford('improve-text', text.length);
```

### Alert System
- **🟡 Low Credits Alert**: When ≤10 credits remaining
- **🔴 Out of Credits Alert**: When 0 credits remaining  
- **🟠 Usage Spike Alert**: When >50 credits used in 1 hour

### Prevention Measures
- **Pre-operation Validation**: Checks credits before executing AI operations
- **Graceful Degradation**: Shows helpful messages when credits are insufficient
- **Usage Analytics**: Helps users understand their consumption patterns

### Getting More Credits
The system is designed to integrate with subscription management:
- **Plan Types**: Free, Basic, Premium, Enterprise
- **Credit Resets**: Configurable reset periods (monthly, etc.)
- **Upgrade Prompts**: Contextual upgrade suggestions when credits are low

## 8. Best Practices

### For Developers
1. **Use the Logging System**: Log important events and errors
2. **Track Performance**: Measure critical operations
3. **Handle Errors Gracefully**: Use error boundaries and proper error handling
4. **Monitor Credits**: Check credit availability before AI operations

### For Users
1. **Monitor the Dashboard**: Check the observability dashboard for issues
2. **Watch for Alerts**: Pay attention to credit and error alerts
3. **Provide Feedback**: Use error feedback to help improve the system
4. **Export Data**: Download logs for debugging or analysis

### For Operations
1. **Monitor Error Rates**: Track error resolution rates
2. **Performance Baselines**: Establish performance benchmarks
3. **Credit Usage Patterns**: Analyze AI feature usage
4. **System Health**: Use logs and metrics for system health monitoring

## 9. Data Storage and Privacy

### Local Storage
- **Logs**: Last 1000 entries stored locally
- **Errors**: Last 100 errors stored locally  
- **Performance**: Last 500 metrics stored locally
- **Credits**: Usage history and current plan stored locally

### Data Export
- All observability data can be exported as JSON
- Useful for debugging, analysis, and compliance
- Available through the Observability Dashboard

### Privacy Considerations
- User IDs and session IDs are tracked for debugging
- No sensitive personal data is logged unnecessarily
- Local storage can be cleared by users
- Production logging should comply with privacy regulations

## 10. Troubleshooting

### Common Issues
1. **Repeated API Requests**: Fixed with polling timeouts and cleanup
2. **Memory Leaks**: Automatic cleanup of old data
3. **Performance Issues**: Monitor component render times
4. **Credit Tracking**: Verify credit operations are properly recorded

### Debug Steps
1. **Check the Dashboard**: Look for errors and performance issues
2. **Export Logs**: Download logs for detailed analysis
3. **Review Credit Usage**: Check if credits are being tracked correctly
4. **Monitor Performance**: Look for slow operations or components

This observability system provides comprehensive monitoring and debugging capabilities for the Resume Builder application, helping ensure reliability, performance, and a great user experience.
