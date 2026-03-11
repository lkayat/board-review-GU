import { useState } from 'react'

interface ImageViewerProps {
  imageUrl: string
  imageFrames?: string[] | null   // multi-frame: array of image URLs
  imageType?: string
  alt?: string
}

/**
 * ImageViewer — renders static radiology images with zoom and optional multi-frame navigation.
 * Supports single image (imageUrl) or a frame stack (imageFrames array).
 */
export default function ImageViewer({ imageUrl, imageFrames, imageType, alt }: ImageViewerProps) {
  const [zoomed, setZoomed] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [imgError, setImgError] = useState(false)

  // Use frame stack if provided and non-empty, else single image
  const frames = imageFrames && imageFrames.length > 1 ? imageFrames : null
  const currentUrl = frames ? frames[frameIndex] : imageUrl
  const totalFrames = frames ? frames.length : 1

  const prevFrame = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFrameIndex(i => Math.max(0, i - 1))
  }

  const nextFrame = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFrameIndex(i => Math.min(totalFrames - 1, i + 1))
  }

  if (imgError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-surface-border bg-surface-card text-slate-500 text-sm" style={{ height: '200px' }}>
        <div className="text-center">
          <p>Image unavailable</p>
          <p className="text-xs mt-1 text-slate-600">Ask the professor for the reference image</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className={`relative rounded-xl overflow-hidden bg-black border border-surface-border ${zoomed ? 'fixed inset-0 z-50 rounded-none border-none flex items-center justify-center bg-black/95' : 'cursor-zoom-in'}`}
        style={!zoomed ? { maxHeight: '420px' } : {}}
        onClick={() => setZoomed(!zoomed)}
        role="button"
        aria-label={zoomed ? 'Click to close zoom' : 'Click to zoom'}
      >
        {/* Modality badge */}
        {imageType && !zoomed && (
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs text-slate-300 font-mono">
            {imageType}
          </div>
        )}

        {/* Frame counter (multi-frame only) */}
        {frames && !zoomed && (
          <div className="absolute top-2 right-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs text-slate-300 font-mono">
            {frameIndex + 1} / {totalFrames}
          </div>
        )}

        <img
          src={currentUrl}
          alt={alt || 'Radiology image'}
          className={`w-full object-contain ${zoomed ? 'max-h-screen max-w-screen-xl cursor-zoom-out' : 'max-h-96'}`}
          onError={() => setImgError(true)}
          draggable={false}
        />

        {!zoomed && !frames && (
          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-0.5 text-xs text-slate-400">
            Click to zoom
          </div>
        )}
      </div>

      {/* Multi-frame navigation (below image, not inside zoomed view) */}
      {frames && !zoomed && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={prevFrame}
            disabled={frameIndex === 0}
            className="px-3 py-1 rounded border border-surface-border text-slate-300 text-sm disabled:opacity-30 hover:border-slate-500 transition-all"
          >
            ← Prev
          </button>
          <span className="text-slate-500 text-sm font-mono">Frame {frameIndex + 1} / {totalFrames}</span>
          <button
            onClick={nextFrame}
            disabled={frameIndex === totalFrames - 1}
            className="px-3 py-1 rounded border border-surface-border text-slate-300 text-sm disabled:opacity-30 hover:border-slate-500 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
