# 🎯 PROJECT RULES - Headless WooCommerce Expert Level

## 🚨 CRITICAL RULES - MUST FOLLOW

### 1. GIT WORKFLOW - MANDATORY!
```bash
# ZAWSZE po każdej udanej implementacji:
1. git add .
2. git commit -m "✨ [Feature] - Brief description"
3. git push origin main

# NIGDY nie rób wielu zmian bez commit!
# To zapewnia śledzenie zmian i możliwość rollback!
```

### 2. EXPERT LEVEL STANDARDS
- **TypeScript strict mode** - ZAWSZE
- **Error handling** - ZAWSZE z try/catch
- **Logging** - ZAWSZE z logger
- **Performance** - ZAWSZE optymalizuj
- **Security** - ZAWSZE waliduj input

### 3. CODE QUALITY
```typescript
// ZAWSZE używaj:
- Existing patterns z projektu
- Redis cache z cacheKeys
- Circuit breaker dla API calls
- Request deduplication
- Proper error boundaries
- TypeScript types
```

### 4. ARCHITECTURE PATTERNS
```typescript
// ZAWSZE implementuj:
- Clean Architecture
- Separation of concerns
- Dependency injection
- SOLID principles
- DRY (Don't Repeat Yourself)
```

### 5. PERFORMANCE RULES
```typescript
// ZAWSZE optymalizuj:
- Bundle size (tree shaking)
- Image optimization
- Lazy loading
- Caching strategies
- ISR dla static pages
```

### 6. SECURITY RULES
```typescript
// ZAWSZE implementuj:
- Input validation
- Rate limiting
- Security headers
- CSRF protection
- XSS prevention
```

### 7. TESTING RULES
```typescript
// ZAWSZE testuj:
- Unit tests dla utilities
- Component tests dla UI
- E2E tests dla user journeys
- API tests dla endpoints
```

### 8. DEPLOYMENT RULES
```bash
# ZAWSZE przed deployment:
1. Test locally
2. Git commit
3. Push to remote
4. Test on staging
5. Deploy to production
```

## 🎯 EXPERT LEVEL 9.6/10 TARGETS

### Performance
- **Lighthouse Score**: 98-99/100
- **Core Web Vitals**: All green
- **Load Time**: < 2.5s
- **Bundle Size**: < 200KB

### Architecture
- **Clean Architecture**: ✅
- **SOLID Principles**: ✅
- **Design Patterns**: ✅
- **Error Handling**: ✅

### Security
- **Input Validation**: ✅
- **Rate Limiting**: ✅
- **Security Headers**: ✅
- **CSRF Protection**: ✅

### Monitoring
- **Error Tracking**: ✅
- **Performance Monitoring**: ✅
- **Health Checks**: ✅
- **Analytics**: ✅

## 🚀 DEVELOPMENT WORKFLOW

### 1. Feature Development
```bash
# 1. Implement feature
# 2. Test locally
# 3. Git commit (MANDATORY!)
# 4. Push to remote
# 5. Deploy to Vercel
```

### 2. Bug Fixes
```bash
# 1. Identify bug
# 2. Fix bug
# 3. Test fix
# 4. Git commit
# 5. Push to remote
```

### 3. Optimization
```bash
# 1. Identify bottleneck
# 2. Implement optimization
# 3. Test performance
# 4. Git commit
# 5. Deploy changes
```

## 📋 COMMIT MESSAGE FORMAT

```bash
# Format: [emoji] [Type] - [Description]

# Examples:
"✨ Add product search functionality"
"🔧 Fix cart calculation bug"
"🎨 Update mobile responsive design"
"⚡ Optimize API response caching"
"🛡️ Add security headers"
"🧪 Add unit tests for utils"
"📱 Improve mobile UX"
"🚀 Deploy to production"
```

## 🎯 SUCCESS CRITERIA

### Expert Level 9.6/10
- ✅ **Performance**: Lighthouse 98-99/100
- ✅ **Architecture**: Clean, scalable, maintainable
- ✅ **Security**: Enterprise-grade protection
- ✅ **Monitoring**: Comprehensive error tracking
- ✅ **Testing**: >80% coverage
- ✅ **Documentation**: Complete and up-to-date

## 🚨 NEVER DO

- ❌ Skip git commits
- ❌ Ignore error handling
- ❌ Skip testing
- ❌ Skip performance optimization
- ❌ Skip security validation
- ❌ Skip documentation updates

## ✅ ALWAYS DO

- ✅ Commit after each feature
- ✅ Handle all errors
- ✅ Test all changes
- ✅ Optimize performance
- ✅ Validate security
- ✅ Update documentation
- ✅ Follow existing patterns
- ✅ Use TypeScript strict mode

---

**Expert Level 9.6/10 - TOP OF THE TOP!** 🚀
