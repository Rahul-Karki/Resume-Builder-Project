export const buildSafePdfDocument = (title: string, contentHtml: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&family=Lora:wght@400;600&family=Outfit:wght@300;400;500;600&family=Source+Serif+4:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    *, *::before, *::after { box-sizing: border-box; }
    .pdf-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      overflow: hidden;
    }
    .pdf-page > * {
      width: 100% !important;
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  <div class="pdf-page">${contentHtml}</div>
</body>
</html>
`;