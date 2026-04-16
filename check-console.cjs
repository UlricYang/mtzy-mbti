const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  page.on('pageerror', error => {
    consoleMessages.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack
    });
  });

  try {
    await page.goto('file:///Users/ulricyang/workspace/job/projects/mbti/mtzy-mbti/dist/inputs-report.html', { waitUntil: 'networkidle' });

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Check #root content
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        innerHTML: root ? root.innerHTML : null,
        textContent: root ? root.textContent : null,
        childCount: root ? root.childElementCount : 0
      };
    });

    console.log('=== Console Messages ===');
    const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    if (errors.length > 0) {
      console.log('\n--- ERRORS ---');
      errors.forEach(e => {
        console.log(`[${e.type}] ${e.text}`);
        if (e.stack) console.log('Stack:', e.stack);
        if (e.location) console.log('Location:', JSON.stringify(e.location));
      });
    } else {
      console.log('No errors found');
    }

    if (warnings.length > 0) {
      console.log('\n--- WARNINGS ---');
      warnings.forEach(w => {
        console.log(`[${w.type}] ${w.text}`);
      });
    }

    console.log('\n=== #root Element ===');
    console.log('Exists:', rootContent.exists);
    console.log('Child count:', rootContent.childCount);
    console.log('Text content:', rootContent.textContent ? rootContent.textContent.substring(0, 200) : '(empty)');
    console.log('Inner HTML:', rootContent.innerHTML ? rootContent.innerHTML.substring(0, 200) : '(empty)');

  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  await browser.close();
})();