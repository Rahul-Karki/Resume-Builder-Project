# PDF Download Integration Guide

## Quick Start

### Option 1: Use Existing DownloadPdfModal (Recommended)

Your existing `DownloadPdfModal.tsx` already works well. Simply use it as is:

```typescript
import DownloadPdfModal from '@/components/DownloadPdfModal';

// In your component
<DownloadPdfModal 
  open={downloadModalOpen} 
  onClose={() => setDownloadModalOpen(false)} 
  resumeSelector="#resume-preview-root" 
/>
```

### Option 2: Use Enhanced PDFDownloadModal

For better UI/UX, use the enhanced version:

```typescript
import PDFDownloadModal from '@/components/PDFDownloadModal';

// In your component
<PDFDownloadModal 
  open={downloadModalOpen} 
  onClose={() => setDownloadModalOpen(false)} 
  resumeSelector="#resume-preview-root" 
  onDownloadComplete={() => console.log('PDF downloaded')} 
/>
```

### Option 3: Use EnhancedResumeStudio

For a complete solution with preview and download:

```typescript
import EnhancedResumeStudio from '@/components/builder/EnhancedResumeStudio';

// In your component
<EnhancedResumeStudio 
  onDownload={() => setDownloadModalOpen(true)}
  canDownload={true}
  isExporting={false}
  exportStatus={null}
/>
```

## Key Features

### ✅ Requirements Met
- ❌ NO BullMQ or worker systems
- ❌ NO background processing (synchronous only)
- ❌ NO native browser print dialog (window.print())
- ❌ NO opening new tabs/windows
- ✅ **Download overlay in SAME window** (modal)
- ✅ **User chooses download destination** via overlay UI
- ✅ **PDF identical to on-screen preview**
- ✅ **Client-side only PDF generation**

### 🎨 Enhanced Features
- **Modern UI**: Clean, accessible modal design
- **Progress Feedback**: Real-time generation progress
- **Error Handling**: Comprehensive fallback mechanisms
- **Memory Management**: Prevents UI freezing
- **Customizable Options**: Filename, orientation, page size

### 🔧 Configuration

```typescript
const options = {
  filename: "my-resume.pdf",
  orientation: "portrait", // "portrait" | "landscape"
  pageSize: "A4",          // "A4" | "Letter"
  quality: "high",        // "high" | "medium" | "low"
  includeBackground: true
};
```

## Migration Steps

1. **Choose your modal option** from above
2. **Install dependencies** (if not already installed):
   ```bash
   npm install html2canvas jspdf
   ```
3. **Update your component** to use the new modal
4. **Test thoroughly** with your resume templates

## Troubleshooting

### Common Issues

1. **"Resume element not found"**:
   - Check your `resumeSelector` matches your HTML structure
   - Use `document.querySelector()` to verify the selector

2. **CORS issues with images**:
   - Ensure images are served with proper CORS headers
   - Use data URLs for local images

3. **Font loading issues**:
   - Wait for fonts to load before generation
   - Use `document.fonts.ready` if available

4. **Large memory usage**:
   - Reduce scale for large resumes
   - Use `quality: 'medium'` for better performance

### Performance Tips

- Use `quality: 'medium'` for faster generation
- Preload images before generation
- Use `scale: 1.5` instead of `2` for better performance
- Clean up temporary elements after generation

## Browser Compatibility

- **Chrome 90+**: Full support
- **Firefox 88+**: Full support
- **Safari 14+**: Full support
- **Edge 90+**: Full support

For older browsers, the system will fall back to basic functionality.
