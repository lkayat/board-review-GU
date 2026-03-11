import { useState } from 'react'

interface ImageViewerProps {
  imageUrl: string
  imageType?: string
  source?: string
  externalId?: string
  alt?: string
}

/**
 * ImageViewer:
 * - Radiopaedia source: embeds the Radiopaedia case viewer via iframe
 * - Local/other source: renders a zoomable <img> with click-to-zoom
 */
export default function ImageViewer({ imageUrl, imageType, source, externalId, alt }: ImageViewerProps) {
  const [zoomed, setZoomed] = useState(false)

  // Radiopaedia embed
  const isRadiopaedia = source === 'radiopaedia' || imageUrl?.includes('radiopaedia.org')
  const radiopaediaId = externalId || imageUrl?.match(/cases\/([^/?]+)/)?.[1]

  if (isRadiopaedia && radiopaediaId) {
    const embedUrl = `https://radiopaedia.org/cases/${radiopaediaId}?lang=us`
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black border border-surface-border" style={{ height: '420px' }}>
        <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs text-slate-300 font-mono">
          {imageType || 'Radiopaedia'} · scroll to browse slices
        </div>
        <iframe
          src={embedUrl}
          title={alt || 'Radiology Case'}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
        />
      </div>
    )
  }

  // Local / static image with zoom on click
  return (
    <div className="relative">
      <div
        className={`relative rounded-xl overflow-hidden bg-black border border-surface-border cursor-zoom-in ${zoomed ? 'fixed inset-0 z-50 rounded-none border-none cursor-zoom-out flex items-center justify-center bg-black/95' : ''}`}
        style={!zoomed ? { maxHeight: '420px' } : {}}
        onClick={() => setZoomed(!zoomed)}
        role="button"
        aria-label={zoomed ? 'Click to close zoom' : 'Click to zoom'}
      >
        {imageType && !zoomed && (
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded px-2 py-0.5 text-xs text-slate-300 font-mono">
            {imageType}
          </div>
        )}
        <img
          src={imageUrl}
          alt={alt || 'Radiology image'}
          className={`w-full object-contain ${zoomed ? 'max-h-screen max-w-screen-xl' : 'max-h-96'}`}
        />
        {!zoomed && (
          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-0.5 text-xs text-slate-400">
            Click to zoom
          </div>
        )}
      </div>
    </div>
  )
}
