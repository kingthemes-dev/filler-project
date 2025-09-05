// Critical CSS for above-the-fold content
export const criticalCSS = `
  /* Critical CSS - Above the fold */
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }
  
  /* Header critical styles */
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
  }
  
  /* Hero section critical styles */
  .hero {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    padding: 2rem 1rem;
    border-radius: 1.5rem 1.5rem 0 0;
  }
  
  /* Product grid critical styles */
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 1.5rem;
  }
  
  /* Button critical styles */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s;
    cursor: pointer;
    border: none;
    text-decoration: none;
  }
  
  .btn-primary {
    background: #000;
    color: #fff;
  }
  
  .btn-primary:hover {
    background: #374151;
  }
  
  /* Loading states */
  .loading {
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Skeleton loading */
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
  }
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  /* Responsive critical styles */
  @media (max-width: 768px) {
    .product-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      padding: 1rem;
    }
    
    .hero {
      padding: 1.5rem 1rem;
    }
  }
`;

// Inject critical CSS
export function injectCriticalCSS() {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
  }
}
