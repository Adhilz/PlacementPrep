"use client"

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      {/* Animated bouncing dots */}
      <div className="flex space-x-2 mb-6">
        <span className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:-0.32s]"></span>
        <span className="w-4 h-4 bg-primary/80 rounded-full animate-bounce [animation-delay:-0.16s]"></span>
        <span className="w-4 h-4 bg-primary/60 rounded-full animate-bounce"></span>
      </div>
      <div className="text-lg font-semibold text-primary mb-2">Please wait...</div>
      <div className="text-sm text-muted-foreground">Your prep journey is about to begin...</div>
    </div>
  )
}