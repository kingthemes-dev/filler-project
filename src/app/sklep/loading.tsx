export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[95vw] mx-auto px-6 py-8">
        {/* Hero section skeleton */}
        <div className="bg-gray-50 py-8 mx-6 rounded-3xl">
          <div className="max-w-[95vw] mx-auto px-6">
            <div className="text-center mb-6">
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
            </div>
            <div className="flex justify-center gap-3 flex-wrap">
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <div className="h-6"></div>
        
        {/* Search bar skeleton */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="h-12 bg-gray-200 rounded-xl w-32 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded-xl w-12 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded-xl w-20 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters skeleton */}
          <div className="lg:w-80">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Products skeleton */}
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
            <div className="grid gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg aspect-square mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
