/**
 * Market Configuration
 * Times are using the market's local timezone.
 * 'open' and 'close' are in HH:MM format (24h).
 * 'lunchStart' and 'lunchEnd' are optional.
 */
const markets = [
    { name: "NYSE / NASDAQ", timezone: "America/New_York", open: "09:30", close: "16:00" },
    { name: "LSE (London)", timezone: "Europe/London", open: "08:00", close: "16:30" },
    { name: "TSE (Tokyo)", timezone: "Asia/Tokyo", open: "09:00", close: "15:00", lunchStart: "11:30", lunchEnd: "12:30" },
    { name: "HKEX (Hong Kong)", timezone: "Asia/Hong_Kong", open: "09:30", close: "16:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { name: "SSE (Shanghai)", timezone: "Asia/Shanghai", open: "09:30", close: "15:00", lunchStart: "11:30", lunchEnd: "13:00" },
    { name: "FSE (Frankfurt)", timezone: "Europe/Berlin", open: "09:00", close: "17:30" },
    { name: "ASX (Sydney)", timezone: "Australia/Sydney", open: "10:00", close: "16:00" }
];

document.getElementById('year').textContent = new Date().getFullYear();

function updateClocks() {
    const now = new Date();

    // UTC Clock
    const utcString = now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false });
    document.getElementById('utc-time').textContent = utcString + " UTC";

    // Local Clock
    const localString = now.toLocaleTimeString('en-US', { hour12: false });
    document.getElementById('local-time').textContent = localString;
}

function getMarketStatus(market) {
    const now = new Date();

    // Get current time in market's timezone
    const marketTimeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: market.timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        weekday: 'short'
    }).formatToParts(now);

    const parts = {};
    marketTimeParts.forEach(p => parts[p.type] = p.value);

    // Parse market HH:MM:SS
    const currentH = parseInt(parts.hour, 10);
    const currentM = parseInt(parts.minute, 10);
    const currentS = parseInt(parts.second, 10);
    const currentTotalMinutes = currentH * 60 + currentM;
    const currentDay = parts.weekday; // 'Mon', 'Tue', ...

    // Parse Open/Close times
    const [openH, openM] = market.open.split(':').map(Number);
    const openTotalMinutes = openH * 60 + openM;

    const [closeH, closeM] = market.close.split(':').map(Number);
    const closeTotalMinutes = closeH * 60 + closeM;

    // Helper to format countdown
    const getCountdown = (minutesWait) => formatTimeUntil(minutesWait, 0, currentS);

    // 1. Weekend Check
    if (currentDay === 'Sat' || currentDay === 'Sun') {
        let minutesToWait = 0;
        if (currentDay === 'Sat') {
            // Rest of Sat + Full Sun + Open Mon
            minutesToWait = (1440 - currentTotalMinutes) + 1440 + openTotalMinutes;
        } else {
            // Rest of Sun + Open Mon
            minutesToWait = (1440 - currentTotalMinutes) + openTotalMinutes;
        }
        return {
            status: 'Closed',
            message: `Opens in ${getCountdown(minutesToWait)}`,
            class: 'status-closed'
        };
    }

    // 2. Lunch Check
    if (market.lunchStart && market.lunchEnd) {
        const [lunchStartH, lunchStartM] = market.lunchStart.split(':').map(Number);
        const [lunchEndH, lunchEndM] = market.lunchEnd.split(':').map(Number);

        const lunchStartTotal = lunchStartH * 60 + lunchStartM;
        const lunchEndTotal = lunchEndH * 60 + lunchEndM;

        if (currentTotalMinutes >= lunchStartTotal && currentTotalMinutes < lunchEndTotal) {
            return {
                status: 'Lunch',
                message: `Opens in ${formatTimeUntil(lunchEndTotal, currentTotalMinutes, currentS)}`,
                class: 'status-lunch'
            };
        }
    }

    // 3. Open Logic
    if (currentTotalMinutes >= openTotalMinutes && currentTotalMinutes < closeTotalMinutes) {
        // It is currently OPEN (unless lunch, checked above)
        // Calculate remaining time until CLOSE or LUNCH
        let nextEventTotal;
        let eventName; // 'Close' or 'Lunch' logic mostly internal now unless we change status text

        if (market.lunchStart) {
            const [lunchStartH, lunchStartM] = market.lunchStart.split(':').map(Number);
            const lunchStartTotal = lunchStartH * 60 + lunchStartM;
            if (currentTotalMinutes < lunchStartTotal) {
                nextEventTotal = lunchStartTotal;
            } else {
                nextEventTotal = closeTotalMinutes;
            }
        } else {
            nextEventTotal = closeTotalMinutes;
        }

        return {
            status: 'Open',
            message: `Closes in ${formatTimeUntil(nextEventTotal, currentTotalMinutes, currentS)}`,
            class: 'status-open'
        };

    } else {
        // 4. Closed (Pre-market or Post-market)

        // Pre-market (Earlier same day)
        if (currentTotalMinutes < openTotalMinutes) {
            return {
                status: 'Closed',
                message: `Opens in ${formatTimeUntil(openTotalMinutes, currentTotalMinutes, currentS)}`,
                class: 'status-closed'
            };
        }

        // Post-market (wait for next day)
        else {
            let minutesToWait = (1440 - currentTotalMinutes) + openTotalMinutes;

            // If it's Friday, we add Sat + Sun (48h/2880m)
            if (currentDay === 'Fri') {
                minutesToWait += 2880;
            }

            return {
                status: 'Closed',
                message: `Opens in ${getCountdown(minutesToWait)}`,
                class: 'status-closed'
            };
        }
    }
}

function formatTimeUntil(targetTotalMinutes, currentTotalMinutes, currentSeconds) {
    let diffMinutes = targetTotalMinutes - currentTotalMinutes;
    // Account for seconds
    // If we have 30 seconds, we aren't completely at the minute yet?
    // Let's do strict seconds calc.
    // Target seconds is 00.
    let diffSeconds = 60 - currentSeconds;
    if (diffSeconds === 60) diffSeconds = 0;
    else diffMinutes--; // We borrowed a minute

    if (diffMinutes < 0) diffMinutes = 0;

    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    const s = diffSeconds;

    return `${h}h ${m}m ${s}s`;
}

function renderMarkets() {
    const tbody = document.getElementById('market-body');
    tbody.innerHTML = '';

    markets.forEach(market => {
        const data = getMarketStatus(market);

        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${market.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${market.timezone}</div>
            </td>
            <td>
                <div class="status-indicator ${data.class}">
                    <div class="dot"></div>
                    ${data.status}
                </div>
            </td>
            <td style="font-family: monospace; font-size: 1rem;">${data.message}</td>
        `;

        tbody.appendChild(tr);
    });
}

// Initial update
updateClocks();
renderMarkets();

// Periodic update
setInterval(() => {
    updateClocks();
    renderMarkets();
}, 1000);
