const admin = require('firebase-admin');
const db = admin.firestore();

const US_STOCK_MARKET_HOLIDAYS = [
    '2025-01-01', '2025-01-20', '2025-02-17',
    '2025-04-18', '2025-05-26', '2025-07-04',
    '2025-09-01', '2025-11-27', '2025-12-25',
];

function getPrefetchContext() {
    const nowKST = new Date();
    const nyDate = new Date(nowKST.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const nyYear = nyDate.getFullYear();
    const nyMonth = String(nyDate.getMonth() + 1).padStart(2, '0');
    const nyDay = String(nyDate.getDate()).padStart(2, '0');
    const nyDateStr = `${nyYear}-${nyMonth}-${nyDay}`;
    return { targetNY: nyDateStr };
}

async function fetchAllSymbols() {
    const snap = await db.collection('stockCategories').get();
    const set = new Set();
    snap.forEach(doc => {
        const data = doc.data();
        if (Array.isArray(data.symbols)) {
            data.symbols.forEach(s => s.ticker && set.add(s.ticker));
        }
    });
    return Array.from(set).sort();
}

module.exports = {
    getPrefetchContext,
    fetchAllSymbols,
    US_STOCK_MARKET_HOLIDAYS
};
