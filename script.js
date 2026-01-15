/**
 * Market Configuration
 * Times are using the market's local timezone.
 * Holidays are YYYY-MM-DD strings.
 */
const markets = [
    {
        name: "NYSE / NASDAQ",
        timezone: "America/New_York",
        open: "09:30",
        close: "16:00",
        holidays: ["2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25"]
    },
    {
        name: "LSE (London)",
        timezone: "Europe/London",
        open: "08:00",
        close: "16:30",
        holidays: ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28"]
    },
    {
        name: "TSE (Tokyo)",
        timezone: "Asia/Tokyo",
        open: "09:00",
        close: "15:00",
        lunchStart: "11:30",
        lunchEnd: "12:30",
        holidays: ["2026-01-01", "2026-01-02", "2026-01-12", "2026-02-11", "2026-02-23", "2026-03-20", "2026-04-29", "2026-05-04", "2026-05-05", "2026-05-06", "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22", "2026-10-12", "2026-11-03", "2026-11-23", "2026-12-31"]
    },
    {
        name: "HKEX (Hong Kong)",
        timezone: "Asia/Hong_Kong",
        open: "09:30",
        close: "16:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        holidays: ["2026-01-01", "2026-02-17", "2026-02-18", "2026-02-19", "2026-04-03", "2026-04-06", "2026-05-01", "2026-05-25", "2026-06-19", "2026-07-01", "2026-10-01", "2026-10-20", "2026-12-25", "2026-12-26"]
    },
    {
        name: "SSE (Shanghai)",
        timezone: "Asia/Shanghai",
        open: "09:30",
        close: "15:00",
        lunchStart: "11:30",
        lunchEnd: "13:00",
        holidays: ["2026-01-01", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-23", "2026-04-06", "2026-05-01", "2026-05-04", "2026-05-05", "2026-06-22", "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07"]
    },
    {
        name: "FSE (Frankfurt)",
        timezone: "Europe/Berlin",
        open: "09:00",
        close: "17:30",
        holidays: ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-01", "2026-05-25", "2026-06-04", "2026-12-24", "2026-12-25", "2026-12-31"]
    },
    {
        name: "ASX (Sydney)",
        timezone: "Australia/Sydney",
        open: "10:00",
        close: "16:00",
        holidays: ["2026-01-01", "2026-01-26", "2026-04-03", "2026-04-06", "2026-04-25", "2026-06-08", "2026-12-25", "2026-12-26"]
    }
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

// Logic handles weekends and holidays by searching forward up to 7 days
function getMarketStatus(market) {
    const now = new Date();

    // Get time in market's timezone
    const getParts = (date) => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: market.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
            weekday: 'short'
        }).formatToParts(date);
        const p = {};
        parts.forEach(part => p[part.type] = part.value);
        return p;
    };

    const currentParts = getParts(now);
    const currentH = parseInt(currentParts.hour, 10);
    const currentM = parseInt(currentParts.minute, 10);
    const currentS = parseInt(currentParts.second, 10);
    const currentTotalMinutes = currentH * 60 + currentM;

    // YYYY-MM-DD
    const currentDateStr = `${currentParts.year}-${currentParts.month}-${currentParts.day}`;
    const currentDay = currentParts.weekday;

    const [openH, openM] = market.open.split(':').map(Number);
    const openTotalMinutes = openH * 60 + openM;

    const [closeH, closeM] = market.close.split(':').map(Number);
    const closeTotalMinutes = closeH * 60 + closeM;

    const isWeekend = (day) => day === 'Sat' || day === 'Sun';
    const isHoliday = (dateStr) => market.holidays && market.holidays.includes(dateStr);

    // Check Today's status logic
    let todayClosed = false;

    // 1. Is Today a Weekend or Holiday?
    if (isWeekend(currentDay) || isHoliday(currentDateStr)) {
        todayClosed = true;
    } else {
        // Today is a working day
        // Check time
        if (currentTotalMinutes < openTotalMinutes) {
            // Before Open -> Opens Today !!
            return {
                status: 'Closed',
                message: `Opens in ${formatTimeUntil(openTotalMinutes, currentTotalMinutes, currentS)}`,
                class: 'status-closed'
            };
        } else if (currentTotalMinutes >= closeTotalMinutes) {
            // After Close -> Opens Next working day
            todayClosed = true;
        } else {
            // OPEN or LUNCH
            if (market.lunchStart && market.lunchEnd) {
                const [lsH, lsM] = market.lunchStart.split(':').map(Number);
                const [leH, leM] = market.lunchEnd.split(':').map(Number);
                const lsTotal = lsH * 60 + lsM;
                const leTotal = leH * 60 + leM;

                if (currentTotalMinutes >= lsTotal && currentTotalMinutes < leTotal) {
                    return {
                        status: 'Lunch',
                        message: `Opens in ${formatTimeUntil(leTotal, currentTotalMinutes, currentS)}`,
                        class: 'status-lunch'
                    };
                }
            }

            // Currently Open
            // Calculate Close or Lunch
            let nextEventTotal;
            if (market.lunchStart) {
                const [lsH, lsM] = market.lunchStart.split(':').map(Number);
                const lsTotal = lsH * 60 + lsM;
                if (currentTotalMinutes < lsTotal) {
                    nextEventTotal = lsTotal;
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
        }
    }

    if (todayClosed) {
        // Calculate wait time involves finding next open day
        // Iterate days from tomorrow

        for (let i = 1; i <= 10; i++) { // Check next 10 days
            // Add i days to current time
            const checkDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            // Note: adding 24h chunks is safe enough given we just check dates/weekdays
            // But we need to be careful about DST changes? 
            // For this simple app, 24h chunks + Intl formatting is robust enough to find the DATE.

            const p = getParts(checkDate);
            const dateStr = `${p.year}-${p.month}-${p.day}`;
            const day = p.weekday;

            if (!isWeekend(day) && !isHoliday(dateStr)) {
                // Found next open day
                // Total minutes wait = (Minutes remaining in today) + (Full days in between) + (Open time of that day)
                const minutesLeftToday = 1440 - currentTotalMinutes;
                const fullDaysInBetween = (i - 1);
                const totalMinutesWait = minutesLeftToday + (fullDaysInBetween * 1440) + openTotalMinutes;

                return {
                    status: 'Closed',
                    message: `Opens in ${formatTimeUntilWait(totalMinutesWait, currentS)}`,
                    class: 'status-closed'
                };
            }
        }
        return { status: 'Closed', message: 'Long Holiday', class: 'status-closed' };
    }
}

// Special formatter for long durations (days)
function formatTimeUntilWait(minutesWait, currentSeconds) {
    // subtract seconds
    let totalSeconds = minutesWait * 60 - currentSeconds;
    if (totalSeconds < 0) totalSeconds = 0;

    const d = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const h = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;

    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m ${s}s`;
}

// Standard formatter for same-day
function formatTimeUntil(targetTotalMinutes, currentTotalMinutes, currentSeconds) {
    let diffMinutes = targetTotalMinutes - currentTotalMinutes;
    let diffSeconds = 60 - currentSeconds;
    if (diffSeconds === 60) diffSeconds = 0;
    else diffMinutes--;

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
