import { NextRequest, NextResponse } from 'next/server';

export function compressionMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add compression headers
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  if (acceptEncoding.includes('br')) {
    response.headers.set('content-encoding', 'br');
  } else if (acceptEncoding.includes('gzip')) {
    response.headers.set('content-encoding', 'gzip');
  }
  
  // Add cache headers for better performance
  response.headers.set('vary', 'Accept-Encoding');
  
  return response;
}
