/**
 * Web Worker for heavy computations
 * Runs in background thread to avoid blocking main UI
 */

// Worker message handler
self.onmessage = function(event) {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'image-processing':
        result = processImage(data);
        break;
      case 'data-processing':
        result = processData(data);
        break;
      case 'calculation':
        result = performCalculation(data);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({
      id,
      type,
      result
    });
  } catch (error) {
    self.postMessage({
      id,
      type,
      error: error.message
    });
  }
};

// Image processing functions
function processImage(data) {
  const { width, height, pixels, operation } = data;
  const processedPixels = new Uint8Array(pixels.length);
  
  switch (operation) {
    case 'grayscale':
      for (let i = 0; i < pixels.length; i += 4) {
        const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        processedPixels[i] = gray;
        processedPixels[i + 1] = gray;
        processedPixels[i + 2] = gray;
        processedPixels[i + 3] = pixels[i + 3];
      }
      break;
      
    case 'blur':
      // Simple box blur
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          let count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = (ny * width + nx) * 4;
                r += pixels[nidx];
                g += pixels[nidx + 1];
                b += pixels[nidx + 2];
                a += pixels[nidx + 3];
                count++;
              }
            }
          }
          
          processedPixels[idx] = r / count;
          processedPixels[idx + 1] = g / count;
          processedPixels[idx + 2] = b / count;
          processedPixels[idx + 3] = a / count;
        }
      }
      break;
      
    default:
      // Copy original pixels
      processedPixels.set(pixels);
  }
  
  return { width, height, pixels: Array.from(processedPixels) };
}

// Data processing functions
function processData(data) {
  const { items, operation, query } = data;
  
  switch (operation) {
    case 'sort':
      return { result: [...items].sort() };
      
    case 'filter':
      return { result: items.filter(item => item > 0) };
      
    case 'map':
      return { result: items.map(item => item * 2) };
      
    case 'search-optimization':
      return { result: optimizeSearch(items, query) };
      
    case 'process-products':
      return { result: processProducts(items) };
      
    default:
      return { result: items };
  }
}

// Search optimization
function optimizeSearch(products, query) {
  const searchTerm = query.toLowerCase();
  
  return products.map(product => {
    const relevanceScore = calculateRelevance(product, searchTerm);
    return { ...product, relevanceScore };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateRelevance(product, searchTerm) {
  let score = 0;
  
  // Name matching
  if (product.name && product.name.toLowerCase().includes(searchTerm)) {
    score += 10;
  }
  
  // Description matching
  if (product.description && product.description.toLowerCase().includes(searchTerm)) {
    score += 5;
  }
  
  // Category matching
  if (product.categories) {
    product.categories.forEach(category => {
      if (category.name && category.name.toLowerCase().includes(searchTerm)) {
        score += 3;
      }
    });
  }
  
  // Tags matching
  if (product.tags) {
    product.tags.forEach(tag => {
      if (tag.name && tag.name.toLowerCase().includes(searchTerm)) {
        score += 2;
      }
    });
  }
  
  return score;
}

// Product processing
function processProducts(products) {
  return products.map(product => {
    // Calculate discount percentage
    let discountPercentage = 0;
    if (product.regular_price && product.sale_price) {
      const regular = parseFloat(product.regular_price);
      const sale = parseFloat(product.sale_price);
      if (regular > 0) {
        discountPercentage = Math.round(((regular - sale) / regular) * 100);
      }
    }
    
    // Process images
    const processedImages = product.images ? product.images.map(image => ({
      ...image,
      alt: image.alt || product.name,
      src: optimizeImageUrl(image.src)
    })) : [];
    
    // Process categories
    const processedCategories = product.categories ? product.categories.map(category => ({
      ...category,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-')
    })) : [];
    
    return {
      ...product,
      discountPercentage,
      processedImages,
      processedCategories,
      isOnSale: discountPercentage > 0,
      formattedPrice: formatPrice(product.price),
      alertText: generateAlertText(product)
    };
  });
}

function optimizeImageUrl(url) {
  if (!url) return '';
  
  // Add optimization parameters
  if (url.includes('wp-content/uploads')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=600&h=600&q=80&f=webp`;
  }
  
  return url;
}

function formatPrice(price) {
  if (!price) return '0,00 zł';
  
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
}

function generateAlertText(product) {
  if (product.stock_status === 'outofstock') {
    return 'Brak w magazynie';
  }
  
  if (product.stock_quantity && product.stock_quantity <= 5) {
    return `Pozostało tylko ${product.stock_quantity} szt.`;
  }
  
  if (product.on_sale) {
    return 'Promocja!';
  }
  
  if (product.featured) {
    return 'Polecane!';
  }
  
  return '';
}

// Mathematical calculations
function performCalculation(data) {
  const { values, operation } = data;
  
  switch (operation) {
    case 'sum':
      return { result: values.reduce((a, b) => a + b, 0) };
      
    case 'average':
      return { result: values.reduce((a, b) => a + b, 0) / values.length };
      
    case 'max':
      return { result: Math.max(...values) };
      
    case 'min':
      return { result: Math.min(...values) };
      
    case 'median':
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return { result: sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid] };
      
    case 'standard-deviation':
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
      return { result: Math.sqrt(variance) };
      
    default:
      return { result: 0 };
  }
}

// Error handling
self.onerror = function(error) {
  console.error('Worker error:', error);
};
