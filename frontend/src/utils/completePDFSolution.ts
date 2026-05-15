import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFOptions {
  filename: string;
  orientation: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
  quality?: 'high' | 'medium' | 'low';
  includeBackground?: boolean;
}

export interface PDFGenerationOptions {
  targetElement: HTMLElement;
  options: PDFOptions;
  backgroundColor?: string;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  timeout?: number;
}

const PAGE_SIZE_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 }
};

const QUALITY_SETTINGS = {
  high: 1,
  medium: 0.75,
  low: 0.5
};

/**
 * Enhanced PDF generation with better error handling and performance
 */
export const generatePDF = async ({
  targetElement,
  options,
  backgroundColor = '#ffffff',
  scale = 2,
  useCORS = true,
  allowTaint = true,
  timeout = 30000
}: PDFGenerationOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('PDF generation timeout'));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    try {
      // Hide any scrollbars and overflow temporarily
      const originalOverflow = targetElement.style.overflow;
      const originalScrollTop = targetElement.scrollTop;
      const originalScrollLeft = targetElement.scrollLeft;
      
      targetElement.style.overflow = 'hidden';
      targetElement.scrollTop = 0;
      targetElement.scrollLeft = 0;

      // Calculate dimensions
      const pageSize = PAGE_SIZE_MM[options.pageSize || 'A4'];
      const isLandscape = options.orientation === 'landscape';
      
      // Create canvas with high resolution
      html2canvas(targetElement, {
        scale,
        useCORS,
        allowTaint,
        backgroundColor: options.includeBackground !== false ? backgroundColor : null,
        logging: false,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
      }).then(canvas => {
        cleanup();
        
        // Restore original styles
        targetElement.style.overflow = originalOverflow;
        targetElement.scrollTop = originalScrollTop;
        targetElement.scrollLeft = originalScrollLeft;

        // Create PDF
        const pdf = new jsPDF({
          orientation: options.orientation,
          unit: 'mm',
          format: [pageSize.width, pageSize.height],
        });

        // Calculate dimensions
        const pageWidth = pageSize.width;
        const pageHeight = pageSize.height;
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        // Handle multi-page content
        if (imgHeight > pageHeight) {
          // Calculate scale to fit content
          const scaleToPage = pageHeight / imgHeight;
          const scaledWidth = imgWidth * scaleToPage;
          const scaledHeight = pageHeight;
          
          let position = 0;
          let pageCount = 0;
          
          while (position < canvas.height) {
            if (pageCount > 0) {
              pdf.addPage();
            }
            
            const sliceHeight = Math.min(scaledHeight, (canvas.height - position) * scaleToPage);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = scaledWidth;
            pageCanvas.height = sliceHeight;
            
            const ctx = pageCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                canvas,
                0,
                (position * canvas.width) / imgWidth,
                canvas.width,
                (sliceHeight * canvas.width) / scaledWidth,
                0,
                0,
                scaledWidth,
                sliceHeight
              );
              
              pdf.addImage(
                pageCanvas.toDataURL('image/png', QUALITY_SETTINGS[options.quality || 'high']),
                'PNG',
                0,
                0,
                imgWidth,
                sliceHeight
              );
            }
            
            position += sliceHeight / scaleToPage;
            pageCount++;
          }
        } else {
          // Single page
          pdf.addImage(
            canvas.toDataURL('image/png', QUALITY_SETTINGS[options.quality || 'high']),
            'PNG',
            0,
            0,
            imgWidth,
            imgHeight
          );
        }

        resolve(pdf.output('blob'));
      }).catch(error => {
        cleanup();
        targetElement.style.overflow = originalOverflow;
        targetElement.scrollTop = originalScrollTop;
        targetElement.scrollLeft = originalScrollLeft;
        reject(error);
      });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

/**
 * Download PDF with browser's native save dialog
 */
export const downloadPDF = async (blob: Blob, filename: string): Promise<void> => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Preload images to ensure they're available for PDF generation
 */
export const preloadImages = async (element: HTMLElement): Promise<void> => {
  const images = element.querySelectorAll('img');
  const promises: Promise<void>[] = [];

  images.forEach(img => {
    if (img.src && !img.src.startsWith('data:')) {
      const promise = new Promise<void>((resolve, reject) => {
        const testImg = new Image();
        testImg.onload = () => resolve();
        testImg.onerror = () => {
          console.warn(`Failed to load image: ${img.src}`);
          resolve();
        };
        testImg.src = img.src;
      });
      promises.push(promise);
    }
  });

  await Promise.all(promises);
};

/**
 * Wait for fonts to load
 */
export const waitForFonts = async (): Promise<void> => {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {
      console.warn('Font loading completed with errors:', error);
    }
  }
  
  // Additional wait for Google Fonts
  await new Promise(resolve => setTimeout(resolve, 1000));
};

/**
 * Generate and download PDF with comprehensive error handling
 */
export const generateAndDownloadPDF = async (
  targetElement: HTMLElement,
  options: PDFOptions,
  fallback?: () => Promise<Blob>
): Promise<void> => {
  try {
    // Preload resources
    await preloadImages(targetElement);
    await waitForFonts();

    // Generate PDF
    const pdfBlob = await generatePDF({
      targetElement,
      options,
    });

    await downloadPDF(pdfBlob, options.filename);
  } catch (error) {
    console.error('Primary PDF generation failed:', error);
    
    if (fallback) {
      try {
        const pdfBlob = await fallback();
        await downloadPDF(pdfBlob, options.filename);
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        throw new Error('PDF generation failed in both primary and fallback methods.');
      }
    } else {
      throw error;
    }
  }
};

/**
 * Fallback PDF generation using basic canvas operations
 */
export const generateFallbackPDF = async (
  targetElement: HTMLElement,
  options: PDFOptions
): Promise<Blob> => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Set canvas dimensions
    const scale = 1; // Lower scale for fallback
    canvas.width = targetElement.scrollWidth * scale;
    canvas.height = targetElement.scrollHeight * scale;

    // Fill background
    ctx.fillStyle = options.includeBackground !== false ? '#ffffff' : 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Simple text rendering (basic fallback)
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText('PDF Generation Fallback', 20, 40);
    ctx.font = '12px Arial';
    ctx.fillText('This is a simplified PDF version.', 20, 60);
    ctx.fillText('Please try again with the primary method.', 20, 80);

    // Create PDF
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

    return pdf.output('blob');
  } catch (error) {
    throw new Error(`Fallback PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Utility function to validate PDF generation requirements
 */
export const validatePDFGeneration = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if html2canvas is available
  if (typeof html2canvas === 'undefined') {
    errors.push('html2canvas library not loaded');
  }

  // Check if jsPDF is available
  if (typeof jsPDF === 'undefined') {
    errors.push('jsPDF library not loaded');
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    errors.push('PDF generation requires browser environment');
  }

  // Check if document is available
  if (typeof document === 'undefined') {
    errors.push('Document not available');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get estimated generation time based on content complexity
 */
export const estimateGenerationTime = (element: HTMLElement): number => {
  const imageCount = element.querySelectorAll('img').length;
  const textLength = element.textContent?.length || 0;
  const elementCount = element.querySelectorAll('*').length;

  // Base time in seconds
  let time = 2;

  // Add time for images (each image adds ~0.5s)
  time += imageCount * 0.5;

  // Add time for text (each 1000 characters adds ~0.1s)
  time += Math.floor(textLength / 1000) * 0.1;

  // Add time for element complexity
  time += Math.floor(elementCount / 100) * 0.2;

  // Cap at reasonable maximum
  return Math.min(time, 30);
};