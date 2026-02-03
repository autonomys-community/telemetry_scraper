const puppeteer = require('puppeteer');
const { activate } = require('@autonomys/auto-utils');
const { spacePledged } = require('@autonomys/auto-consensus');

const TIMEOUT = 30000; // 30 seconds

async function scrapeNetwork(page, url, networkId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping ${networkId}...`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(60));

  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: TIMEOUT
  });

  console.log('Page loaded, clicking Stats tab...');
  await page.click('.Chain-Tab[title="Stats"]');
  await page.waitForSelector('.Chain-content table', { timeout: TIMEOUT });
  await new Promise(resolve => setTimeout(resolve, 500));

  const stats = await page.evaluate(() => {
    const getTextByMultipleSelectors = (selectors) => {
      for (const selector of selectors) {
        let element;
        try {
          if (selector.startsWith('/')) {
            element = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          } else {
            element = document.querySelector(selector);
          }
          if (element) return element.textContent.trim();
        } catch (error) {}
      }
      return null;
    };

    return {
      nodeCount: getTextByMultipleSelectors(['.Chains-chain-selected .Chains-node-count']),
      subspaceNodeCount: getTextByMultipleSelectors([
        "#root > div > div.Chain > div.Chain-content-container > div > div > div:nth-child(2) > table > tbody > tr:nth-child(1) > td.Stats-count",
        "//*[@id='root']/div/div[2]/div[2]/div/div/div[2]/table/tbody/tr[1]/td[2]",
        "/html/body/div/div/div[2]/div[2]/div/div/div[2]/table/tbody/tr[1]/td[2]"
      ]),
      spaceAcresNodeCount: getTextByMultipleSelectors([
        "#root > div > div.Chain > div.Chain-content-container > div > div > div:nth-child(2) > table > tbody > tr:nth-child(2) > td.Stats-count",
        "//*[@id='root']/div/div[2]/div[2]/div/div/div[2]/table/tbody/tr[2]/td[2]",
        "/html/body/div/div/div[2]/div[2]/div/div/div[2]/table/tbody/tr[2]/td[2]"
      ]),
      linuxNodeCount: getTextByMultipleSelectors([
        "#root > div > div.Chain > div.Chain-content-container > div > div > div:nth-child(3) > table > tbody > tr:nth-child(1) > td.Stats-count",
        "//*[@id='root']/div/div[2]/div[2]/div/div/div[3]/table/tbody/tr[1]/td[2]",
        "/html/body/div/div/div[2]/div[2]/div/div/div[3]/table/tbody/tr[1]/td[2]"
      ]),
      windowsNodeCount: getTextByMultipleSelectors([
        "#root > div > div.Chain > div.Chain-content-container > div > div > div:nth-child(3) > table > tbody > tr:nth-child(2) > td.Stats-count",
        "//*[@id='root']/div/div[2]/div[2]/div/div/div[3]/table/tbody/tr[2]/td[2]",
        "/html/body/div/div/div[2]/div[2]/div/div/div[3]/table/tbody/tr[2]/td[2]"
      ]),
      macosNodeCount: getTextByMultipleSelectors([
        "#root > div > div.Chain > div.Chain-content-container > div > div > div:nth-child(3) > table > tbody > tr:nth-child(3) > td.Stats-count",
        "//*[@id='root']/div/div[2]/div[2]/div/div/div[3]/table/tbody/tr[3]/td[2]",
        "/html/body/div/div/div[2]/div[2]/div/div/div[3]/table/tbody/tr[3]/td[2]"
      ])
    };
  });

  console.log('Stats scraped from telemetry page.');

  console.log(`Fetching spacePledged for ${networkId}...`);
  const api = await activate({ networkId });
  const spacePledgedData = await spacePledged(api);

  return { stats, spacePledgedData, api };
}

function formatResults(networkId, data, timestamp, extraData = null) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results for ${networkId.toUpperCase()}`);
  console.log('─'.repeat(60));
  
  console.log('\n📊 Scraped Stats:');
  console.log(`  Node Count:         ${data.stats.nodeCount || 'N/A'}`);
  console.log(`  Subspace Nodes:     ${data.stats.subspaceNodeCount || 'N/A'}`);
  console.log(`  Space Acres Nodes:  ${data.stats.spaceAcresNodeCount || 'N/A'}`);
  console.log(`  Linux Nodes:        ${data.stats.linuxNodeCount || 'N/A'}`);
  console.log(`  Windows Nodes:      ${data.stats.windowsNodeCount || 'N/A'}`);
  console.log(`  macOS Nodes:        ${data.stats.macosNodeCount || 'N/A'}`);
  
  console.log('\n💾 Space Pledged:');
  console.log(`  Raw (bytes):        ${data.spacePledgedData.toString()}`);

  // Build row data
  const row = [
    timestamp,
    data.stats.nodeCount || '',
    data.spacePledgedData.toString(),
    data.stats.subspaceNodeCount || '',
    data.stats.spaceAcresNodeCount || '',
    data.stats.linuxNodeCount || '',
    data.stats.windowsNodeCount || '',
    data.stats.macosNodeCount || ''
  ];

  // Extra columns only for mainnet
  if (extraData) {
    console.log(`  In PiB (÷2^50):     ${extraData.spacePledgedPiB} PiB`);
    console.log(`  In PB (÷1000^5):    ${extraData.spacePledgedPB} PB`);
    
    console.log('\n💰 Transaction Fee:');
    console.log(`  Current Byte Fee:   ${extraData.currentByteFee.toString()}`);
    console.log(`  Fee per GB (AI3):   ${extraData.feePerGB}`);
    
    row.push(extraData.spacePledgedPiB, extraData.spacePledgedPB, extraData.feePerGB);
  }
  
  console.log('\n📝 Row data (as would be written to sheet):');
  console.log(`  [${row.map(v => JSON.stringify(v)).join(', ')}]`);
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const networks = args.length > 0 ? args : ['chronos', 'mainnet'];
  
  console.log('🚀 Telemetry Scraper Test');
  console.log(`Networks to scrape: ${networks.join(', ')}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const timestamp = new Date().toISOString();
    console.log(`\nTimestamp: ${timestamp}`);

    for (const network of networks) {
      let url;
      if (network === 'chronos') {
        url = 'https://telemetry.subspace.network/#list/0x91912b429ce7bf2975440a0920b46a892fddeeaed6ccc11c93f2d57ad1bd69ab';
      } else if (network === 'mainnet') {
        url = 'https://telemetry.subspace.network/#list/0x66455a580aabff303720aa83adbe6c44502922251c03ba73686d5245da9e21bd';
      } else {
        console.error(`Unknown network: ${network}. Skipping.`);
        continue;
      }

      const page = await browser.newPage();
      const data = await scrapeNetwork(page, url, network);
      
      let extraData = null;
      
      // Extra columns only for mainnet
      if (network === 'mainnet') {
        console.log('Fetching transactionByteFee for mainnet...');
        const transactionByteFeeData = await data.api.query.transactionFees.transactionByteFee();
        const currentByteFee = transactionByteFeeData.current;

        // Calculate derived values
        const spacePledgedBytes = Number(data.spacePledgedData);
        const spacePledgedPiB = (spacePledgedBytes / Math.pow(2, 50)).toFixed(2);  // bytes to PiB
        const spacePledgedPB = (spacePledgedBytes / Math.pow(1000, 5)).toFixed(2);  // bytes to PB
        const feePerGB = (Number(currentByteFee) * Math.pow(10, 9) / 1e18).toFixed(2);  // fee per byte to fee per GB (in AI3)

        extraData = { spacePledgedPiB, spacePledgedPB, feePerGB, currentByteFee };
      }
      
      formatResults(network, data, timestamp, extraData);
      await page.close();
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
}

main();
