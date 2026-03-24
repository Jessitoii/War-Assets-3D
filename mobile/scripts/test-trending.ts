import { XMLParser } from 'fast-xml-parser';

async function testSync() {
  console.log('--- RSS SYNC TEST ---');
  const RSS_URL = 'https://news.google.com/rss/search?q=military+defense+tanks+war+jets+missiles&hl=en-US&gl=US&ceid=US:en';
  
  try {
    const response = await fetch(RSS_URL);
    const xmlData = await response.text();
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);
    const items = jsonObj.rss?.channel?.item || [];
    
    console.log(`Fetched ${items.length} items.`);
    
    const mockAssets = [
      { id: '1', name: 'Leopard 2' },
      { id: '2', name: 'Abrams' },
      { id: '3', name: 'T-90' },
      { id: '4', name: 'F-35' },
      { id: '5', name: 'Himars' }
    ];

    const trendingMatches = [];
    for (const item of items.slice(0, 30)) {
      const title = item.title || '';
      for (const asset of mockAssets) {
        if (title.toLowerCase().includes(asset.name.toLowerCase())) {
          trendingMatches.push({ asset: asset.name, title });
        }
      }
    }

    console.log('Matches found:', trendingMatches.length);
    trendingMatches.forEach(m => console.log(`- [${m.asset}] ${m.title}`));

  } catch (e) {
    console.error('Test failed:', e);
  }
}

testSync();
