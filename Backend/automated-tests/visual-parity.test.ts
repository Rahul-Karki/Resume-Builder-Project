import { describe, it, expect } from 'vitest';
import buildResumeHtml from '../src/modules/export/buildResumeHtml';
import puppeteer from 'puppeteer';

describe('resume visual parity (smoke)', () => {
  it('renders the canonical HTML and matches snapshot (base64 PNG)', async () => {
    const resume = {
      title: 'John Doe',
      personalInfo: { name: 'John Doe', email: 'john@example.com', location: 'Remote' },
      sections: {
        experience: [
          { role: 'Software Engineer', company: 'Acme Inc', start: '2019', end: '2022', bullets: ['Built a widget', 'Improved performance by 30%'] },
        ],
        skills: [ { category: 'Languages', items: ['JavaScript', 'TypeScript'] } ],
      },
      style: { bodyFont: 'Outfit, sans-serif', headingFont: 'Playfair Display, serif' },
    } as any;

    const html = buildResumeHtml(resume, 'test-preset');

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.emulateMediaType('print');
    try { await page.waitForFunction('document.fonts.ready', { timeout: 7000 }); } catch (e) { /* ignore */ }
    const shot = await page.screenshot({ fullPage: true, type: 'png' });
    await browser.close();

    expect(shot.toString('base64')).toMatchSnapshot();
  }, 30000);
});
