export function updateHttpServerStats(httpServerStats) {
    const statsContainer = document.querySelector('.http-servers-stats-container');
    statsContainer.innerHTML = ''; // Clear previous stats

    httpServerStats.forEach(data => {
        const statCard = document.createElement('div');
        statCard.className = 'http-server-stat-card';
        statCard.innerHTML = `
            <h3>${data.hostname}</h3>
            <div class="http-server-stat-line">
                <span class="success-label">Success:</span> 
                <span >${data.success} requests</span> 
                <span class="latency-value">~${data.avgSuccessDuration}ms</span>
            </div>
            <div class="http-server-stat-line">
                <span class="fail-label">Fail:</span> 
                <span >${data.fail} requests</span> 
                <span class="latency-value">~${data.avgFailDuration}ms</span>
            </div>
            <div class="success-rate ${getSuccessRateColorClass(calculatePercent(data.success, data.success + data.fail))}">${calculatePercent(data.success, data.success + data.fail)}% Success</div>
        `;
        statsContainer.appendChild(statCard);
    });
}

export function calculateHttpServerStats(webhookLogsData) {
    const stats = {};

    webhookLogsData.forEach(log => {
        const hostname = getHostnameFromUrl(log.url);
        if (!stats[hostname]) {
            stats[hostname] = {
                hostname,
                success: 0,
                fail: 0,
                totalSuccessDuration: 0,
                totalFailDuration: 0,
                countSuccess: 0,
                countFail: 0
            };
        }
        if (log.responseCode >= 200 && log.responseCode < 300) {
            stats[hostname].success += 1;
            stats[hostname].totalSuccessDuration += log.responseDuration;
            stats[hostname].countSuccess += 1;
        } else {
            stats[hostname].fail += 1;
            stats[hostname].totalFailDuration += log.responseDuration;
            stats[hostname].countFail += 1;
        }
    });

    // Calculate average response duration for successful and failed responses
    Object.keys(stats).forEach(hostname => {
        stats[hostname].avgSuccessDuration = stats[hostname].countSuccess > 0
            ? (stats[hostname].totalSuccessDuration / stats[hostname].countSuccess).toFixed(2)
            : 'N/A';
        stats[hostname].avgFailDuration = stats[hostname].countFail > 0
            ? (stats[hostname].totalFailDuration / stats[hostname].countFail).toFixed(2)
            : 'N/A';
    });

    // Convert stats into an array and sort by hostname
    return Object.values(stats).sort((a, b) => a.hostname.localeCompare(b.hostname));
}

function getHostnameFromUrl(url) {
    return new URL(url).hostname;
}

function calculatePercent(partialValue, totalValue) {
    return totalValue ? ((partialValue / totalValue) * 100).toFixed(2) : 0;
}

function getSuccessRateColorClass(successRate) {
    let rate = 0;
    if (typeof successRate == "string") {
        rate = parseFloat(successRate.replace('%', ''));
    } else {
        rate = parseFloat(successRate);
    }

    if (rate >= 80) {
        return 'rate-success';
    } else if (rate >= 50) {
        return 'rate-warning';
    } else {
        return 'rate-fail';
    }
}