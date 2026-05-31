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

        // Scale to fit single page (never create multiple pages)
        const fitScale = Math.min(1, pageHeight / imgHeight);
        const displayH = imgHeight * fitScale;
        const offsetY = (pageHeight - displayH) / 2; // center vertically

        pdf.addImage(
          canvas.toDataURL('image/png', QUALITY_SETTINGS[options.quality || 'high']),
          'PNG',
          0,
          offsetY,
          imgWidth,
          displayH
        );

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