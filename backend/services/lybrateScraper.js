const puppeteer = require('puppeteer');
async function scrapeLybrateDoctors(city, specialty) {
  let citySlug = city.toLowerCase().trim().replace(/\s+/g, '-');
  if (citySlug === 'bengaluru') {
    citySlug = 'bangalore';
  } else if (citySlug === 'new-delhi') {
    citySlug = 'delhi';
  }

  let specialtySlug = specialty.toLowerCase().trim()
    .replace('ear-nose-throat (ent) specialist', 'ent-specialist')
    .replace('ent specialist', 'ent-specialist')
    .replace(/^ent$/, 'ent-specialist')
    .replace('gynaecologist/obstetrician', 'gynaecologist')
    .replace('gynecologist/obstetrician', 'gynaecologist')
    .replace('gynecologist', 'gynaecologist')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-');

  const TARGET_URL = `https://www.lybrate.com/${citySlug}/${specialtySlug}`;

  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;

  if (!executablePath && process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const path = require('path');

    const findChromeBinary = (dir) => {
      if (!fs.existsSync(dir)) return null;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findChromeBinary(fullPath);
          if (found) return found;
        } else if (file === 'chrome' && (stat.mode & 0o111)) {
          return fullPath;
        }
      }
      return null;
    };

    const cacheDirs = [
      path.join(__dirname, '..', '.cache', 'puppeteer'),
      '/opt/render/.cache/puppeteer'
    ];

    for (const cacheDir of cacheDirs) {
      if (fs.existsSync(cacheDir)) {
        try {
          const foundPath = findChromeBinary(cacheDir);
          if (foundPath) {
            executablePath = foundPath;
            break;
          }
        } catch (err) {
          console.error('⚠️ [Crawler] Error searching cache directory:', err.message);
        }
      }
    }

    if (!executablePath) {
      const systemPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/opt/google/chrome/chrome'
      ];
      for (const sysPath of systemPaths) {
        if (fs.existsSync(sysPath)) {
          executablePath = sysPath;

          break;
        }
      }
    }

    if (executablePath) {

    } else {
      console.warn('⚠️ [Crawler] No Chrome binary detected. Puppeteer will fallback to default browser launch.');
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    ignoreDefaultArgs: ['--disable-extensions'],
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--use-gl=egl',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  });

  try {

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36');

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await new Promise(r => setTimeout(r, 2000));

    const doctors = await page.evaluate((specialty) => {
      const cards = document.querySelectorAll('div[class*="doctorCard_cardContainer"]');
      const results = [];

      cards.forEach(card => {
        const nameNode = card.querySelector('[class*="doctorCard_doctorName"]');
        const expNode = card.querySelector('[class*="doctorCard_experience"]');
        const feeNode = card.querySelector('[class*="doctorCard_chargeWrapper"]');
        const clinicNode = card.querySelector('[class*="doctorCard_locationName"]');

        const clinicNameText = clinicNode ? clinicNode.innerText.trim() : '';

        const name = nameNode ? nameNode.innerText.trim().replace(/^Dr\.\s+/i, '') : null;
        const experience = expNode ? parseInt(expNode.innerText.replace(/[^0-9]/g, ''), 10) : 10;

        let fee = null;
        if (feeNode) {
          const cleanedText = feeNode.innerText.replace(/\d+\s*%/g, '').replace(/,/g, '');
          const numbers = cleanedText.match(/\d+/g);
          if (numbers && numbers.length > 0) {
            const parsedNumbers = numbers.map(n => parseInt(n, 10)).filter(num => num > 0);
            if (parsedNumbers.length > 0) {
              fee = Math.min(...parsedNumbers);
            }
          }
        }

        const address = clinicNameText || '';

        if (name) {
          results.push({
            name,
            specialty,
            experience: isNaN(experience) ? 10 : experience,
            fee: isNaN(fee) || fee === null ? null : fee,
            address,
          });
        }
      });

      return results;
    }, specialty);
    return doctors;

  } catch (error) {
    console.error('❌ [Crawler] Scraper execution failed:', error);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeLybrateDoctors
};
