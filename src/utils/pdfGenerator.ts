import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PDFOptions {
  filename: string;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

export interface PDFGenerationOptions {
  targetElement: HTMLElement;
  options: PDFOptions;
  backgroundColor?: string;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
}

/**
 * Generate PDF from HTML element using html2canvas + jsPDF
 */
export const generatePDF = async ({
  targetElement,
  options,
  backgroundColor = '#ffffff',
  scale = 2,
  useCORS = true,
  allowTaint = true,
}: PDFGenerationOptions): Promise<Blob> => {
  try {
    // Show loading state
    const originalOverflow = targetElement.style.overflow;
    targetElement.style.overflow = 'hidden';

    // Calculate dimensions based on page size and orientation
    const pageWidth = options.pageSize === 'A4' ? 210 : 216; // mm
    const pageHeight = options.pageSize === 'A4' ? 297 : 279; // mm
    const isLandscape = options.orientation === 'landscape';

    // Create canvas with high resolution
    const canvas = await html2canvas(targetElement, {
      scale,
      useCORS,
      allowTaint,
      backgroundColor,
      logging: false,
      width: targetElement.scrollWidth,
      height: targetElement.scrollHeight,
    });

    // Restore original overflow
    targetElement.style.overflow = originalOverflow;

    // Get image data from canvas
    const imgData = canvas.toDataURL('image/png');

    // Create PDF with appropriate dimensions
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: [pageWidth, pageHeight],
    });

    // Calculate scaling to fit content on page
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    // Check if content fits on one page
    if (imgHeight <= pageHeight) {
      // Single page PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multi-page PDF
      let remainingHeight = imgHeight;
      let position = 0;

      while (remainingHeight > 0) {
        const pageHeightRemaining = Math.min(pageHeight, remainingHeight);
        
        if (position > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          imgData,
          'PNG',
          0,
          -position,
          imgWidth,
          imgHeight
        );

        remainingHeight -= pageHeight;
        position += pageHeight;
      }
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
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

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF. Please try again.');
  }
};

/**
 * Enhanced PDF generation with better error handling and fallbacks
 */
export const generateAndDownloadPDF = async (
  targetElement: HTMLElement,
  options: PDFOptions,
  fallback?: () => Promise<Blob>
): Promise<void> => {
  try {
    // Try primary method
    const pdfBlob = await generatePDF({
      targetElement,
      options,
    });

    await downloadPDF(pdfBlob, options.filename);
  } catch (error) {
    console.warn('Primary PDF generation failed:', error);
    
    if (fallback) {
      try {
        // Try fallback method
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