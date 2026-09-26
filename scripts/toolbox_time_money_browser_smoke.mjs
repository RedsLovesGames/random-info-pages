import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

async function loginTime(page) {
  await page.locator('#accessGate').waitFor({ state:'visible' });
  await page.locator('#loginUsername').fill('tommy');
  await page.locator('#loginPassword').fill(String.fromCharCode(50,51,52,53));
  await page.locator('#loginForm button[type="submit"]').click();
  await page.locator('#protectedTimeApp').waitFor({ state:'visible' });
}

async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({ scroll:document.documentElement.scrollWidth, client:document.documentElement.clientWidth }));
  assert.ok(result.scroll <= result.client + 2, `${label} horizontal overflow ${result.scroll} > ${result.client}`);
}

try {
  {
    const page = await browser.newPage({ viewport:{width:1280,height:900} });
    const errors=[]; page.on('pageerror', error=>errors.push(error));
    await page.goto(`${base}/tools/time/?action=date-math`, { waitUntil:'domcontentloaded' });
    await loginTime(page);
    await page.locator('#scheduleView').waitFor({ state:'visible' });
    await page.locator('#dateMathFrom').fill('2026-09-21');
    await page.locator('#dateMathTo').fill('2026-09-25');
    await page.locator('#dateMathHolidays').fill('2026-09-23');
    await page.locator('#runDateMath').click();
    assert.match(await page.locator('#dateMathResult').innerText(), /4 calendar days/i);
    assert.match(await page.locator('#dateMathResult').innerText(), /4 business days/i);

    await page.locator('#timestampTool').click();
    await page.locator('#timestampInput').fill('2026-09-25T12:00');
    await page.locator('#runTimestamp').click();
    assert.match(await page.locator('#timestampResult').innerText(), /Unix seconds:/i);

    await page.locator('#calendarTool').click();
    await page.locator('#icsTitle').fill('Toolbox test');
    await page.locator('#icsFreq').selectOption('WEEKLY');
    await page.locator('#icsDays input[value="MO"]').check();
    await page.locator('#buildIcs').click();
    const calendar = await page.locator('#calendarResult').innerText();
    assert.match(calendar, /FREQ=WEEKLY/i);
    assert.match(calendar, /BEGIN:VCALENDAR/i);

    await page.locator('#cronTool').click();
    await page.locator('#cronExpression').fill('0 9 * * 1-5');
    await page.locator('#runCron').click();
    assert.match(await page.locator('#cronResult').innerText(), /Monday through Friday/i);
    assert.ok(await page.locator('#whenWeMeetLink').getAttribute('href'));
    await noOverflow(page, 'Time scheduling desktop');
    assert.equal(errors.length,0,errors.map(e=>e.stack||e.message).join('\n'));
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport:{width:1280,height:900} });
    const errors=[]; page.on('pageerror', error=>errors.push(error));
    await page.goto(`${base}/tools/money/?action=growth`, { waitUntil:'domcontentloaded' });
    await page.locator('#growthPanel').waitFor({ state:'visible' });
    await page.locator('#scenarioAmount').fill('10000');
    await page.locator('#scenarioYears').fill('10');
    await page.locator('#scenarioRate').fill('8');
    await page.locator('#growthContribution').fill('250');
    assert.match(await page.locator('#growthResult').innerText(), /growth/i);

    await page.locator('[data-money-mode="savings"]').click();
    await page.locator('#savingsTarget').fill('50000');
    assert.match(await page.locator('#savingsMonthly').innerText(), /month/i);

    await page.locator('[data-money-mode="loans"]').click();
    await page.locator('#loanPrincipal').fill('300000');
    await page.locator('#scenarioRate').fill('6');
    await page.locator('#scenarioYears').fill('30');
    const payment = await page.locator('#loanPayment').innerText();
    assert.match(payment, /1,7|1,8|1,9/);
    assert.doesNotMatch(await page.locator('#loanInterest').innerText(), /^—$/);

    await page.locator('[data-money-mode="income"]').click();
    await page.locator('#incomeHourly').fill('20');
    await page.locator('#incomeOvertimeHours').fill('5');
    assert.match(await page.locator('#incomePaycheck').innerText(), /950/);

    await page.reload({ waitUntil:'domcontentloaded' });
    assert.equal(await page.locator('#scenarioYears').inputValue(), '30');
    assert.equal(await page.locator('#scenarioRate').inputValue(), '6');
    await noOverflow(page, 'Money scenario desktop');
    assert.equal(errors.length,0,errors.map(e=>e.stack||e.message).join('\n'));
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport:{width:390,height:844} });
    await page.goto(`${base}/tools/time/?action=cron`, { waitUntil:'domcontentloaded' });
    await loginTime(page);
    await page.locator('#scheduleView').waitFor({ state:'visible' });
    await noOverflow(page, 'Time scheduling mobile');
    await page.goto(`${base}/tools/money/?action=loans`, { waitUntil:'domcontentloaded' });
    await page.locator('#loanPanel').waitFor({ state:'visible' });
    await noOverflow(page, 'Money scenario mobile');
    await page.close();
  }

  console.log('PASS Step 7 Time scheduling and Money finance scenario smoke');
} finally {
  await browser.close();
}
