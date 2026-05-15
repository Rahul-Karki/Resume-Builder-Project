import React, { useState, useRef } from 'react';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
import { openPrintPreviewForElement } from '../utils/printPreview';

interface PDFDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePDF?: (options: PDFOptions) => Promise<void>;
  isLoading?: boolean;
}

interface PDFOptions {
  filename: string;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

const PDFDownloadModal: React.FC<PDFDownloadModalProps> = ({
  isOpen,
  onClose,
  onGeneratePDF,
  isLoading = false,
}) => {
  const [filename, setFilename] = useState<string>('resume.pdf');
  const [pageSize, setPageSize] = useState<PDFOptions['pageSize']>('A4');
  const [orientation, setOrientation] = useState<PDFOptions['orientation']>('portrait');
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalLoading(true);
    try {
      const opts = { filename, pageSize, orientation } as PDFOptions;

      if (onGeneratePDF) {
        await onGeneratePDF(opts);
      } else {
        // Try to find a resume preview element on the page
        const target = document.querySelector<HTMLElement>('#resume-preview-root') || document.querySelector<HTMLElement>('.resume-preview');
        if (!target) throw new Error('Resume preview element not found. Provide `onGeneratePDF` or add an element with id="resume-preview-root" or class="resume-preview".');

        await generateAndDownloadPDF(target, opts);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Download PDF</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                Filename
              </label>
              <input
                type="text"
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700 mb-2">
                  Page Size
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PDFOptions['pageSize'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  disabled={loading}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>

              <div>
                <label htmlFor="orientation" className="block text-sm font-medium text-gray-700 mb-2">
                  Orientation
                </label>
                <select
                  id="orientation"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as PDFOptions['orientation'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  disabled={loading}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Generating...' : 'Generate & Download'}
              </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setInternalLoading(true);
                    try {
                      const target = document.querySelector<HTMLElement>('#resume-preview-root') || document.querySelector<HTMLElement>('.resume-preview');
                      if (!target) throw new Error('Resume preview element not found for print preview');
                      await openPrintPreviewForElement(target);
                    } catch (e: any) {
                      // eslint-disable-next-line no-console
                      console.error('Print preview failed', e);
                      alert(e?.message || 'Failed to open print preview');
                    } finally {
                      setInternalLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Open Print Preview
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PDFDownloadModal;