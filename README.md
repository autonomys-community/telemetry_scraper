# Autonomys Telemetry Scraper

A Netlify serverless function that collects network telemetry data from the Autonomys (Subspace) blockchain networks and writes it to Google Sheets for tracking and analysis.

## Overview

This scraper collects data from two networks:

- **Chronos** (testnet) - Basic telemetry stats
- **Mainnet** - Extended telemetry stats with additional on-chain metrics

### Data Collected

#### Both Networks
| Column | Description |
|--------|-------------|
| Timestamp | ISO 8601 timestamp of data collection |
| Node Count | Total number of nodes on the network |
| Space Pledged | Raw space pledged in bytes |
| Subspace Node Count | Nodes running Subspace CLI |
| Space Acres Node Count | Nodes running Space Acres |
| Linux Node Count | Nodes on Linux |
| Windows Node Count | Nodes on Windows |
| macOS Node Count | Nodes on macOS |

#### Mainnet Only (Additional Columns)
| Column | Description |
|--------|-------------|
| Space Pledged (PiB) | Space pledged in Pebibytes (bytes ÷ 2^50) |
| Space Pledged (PB) | Space pledged in Petabytes (bytes ÷ 1000^5) |
| Fee per GB (AI3) | Transaction fee per GB in AI3 tokens |
| Total Staked (AI3) | Total staked amount including storage fees |

### Data Sources

- **Telemetry Stats**: Scraped from [telemetry.subspace.network](https://telemetry.subspace.network) using Puppeteer
- **Space Pledged**: Fetched via `@autonomys/auto-consensus` SDK
- **Transaction Fees**: Queried from `transactionFees.transactionByteFee()` pallet
- **Staking Data**: Aggregated from all operators via `@autonomys/auto-consensus`

## Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud service account with Sheets API access
- Netlify account (for deployment)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file or configure in Netlify:

```env
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-spreadsheet-id
```

## Running Locally

### Test the Scraper

Use the test script to verify scraping and API calls work correctly:

```bash
# Test both networks (chronos + mainnet)
node test-scraper.js

# Test only mainnet (includes all extra columns)
node test-scraper.js mainnet

# Test only chronos
node test-scraper.js chronos
```

The test script outputs:
- Scraped stats from telemetry page
- On-chain data (space pledged, fees, staking)
- Formatted row data as it would appear in Google Sheets

### Run with Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run locally
netlify dev
```

## Deployment

### Deploy to Netlify

```bash
netlify deploy --prod
```

### Scheduled Execution

The function is configured to run daily via Netlify scheduled functions:

```javascript
export const config = {
  schedule: "@daily"
};
```

The function also includes a 10-minute deduplication check to prevent duplicate entries if triggered multiple times.

## Project Structure

```
telemetry_scrapper/
├── netlify/
│   └── functions/
│       └── updatesheet.js    # Main Netlify function
├── test-scraper.js           # Local testing script
├── netlify.toml              # Netlify configuration
├── package.json
└── README.md
```

## Configuration

### Netlify Configuration (`netlify.toml`)

```toml
[functions]
  node_bundler = "esbuild"

[functions.updatesheet]
  timeout = 60
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@autonomys/auto-utils` | Blockchain connection and token utilities |
| `@autonomys/auto-consensus` | Consensus layer queries (space pledged, operators) |
| `puppeteer` / `puppeteer-core` | Browser automation for scraping |
| `@sparticuz/chromium` | Chromium binary for serverless environments |
| `googleapis` | Google Sheets API client |

## License

ISC

