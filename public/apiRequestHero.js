export function updateApiRequestHero(apiData) {
    if (!apiData || typeof apiData !== 'object') {
        console.error('Invalid apiData passed to updateApiRequestHero:', apiData);
        return;
    }

    const responseCodeCounts = apiData.responseCodeCounts || {};
    const apiSuccessCount = responseCodeCounts['200'] || 0;
    const apiFailCount = Object.keys(responseCodeCounts)
        .filter(code => !code.startsWith('2'))
        .reduce((sum, code) => sum + (responseCodeCounts[code] || 0), 0);
    const apiSuccessRate = apiSuccessCount + apiFailCount > 0 ?
        ((apiSuccessCount / (apiSuccessCount + apiFailCount)) * 100).toFixed(2) : 'N/A';

    const apiMetricsInfo = document.getElementById('apiHeroInfo');
    apiMetricsInfo.innerHTML = `
        <div class="api-summary-label"><b>API Requests</b></div>
        <div class="api-summary-info">
            <span class="success">Success: ${formatNumber(apiSuccessCount)}</span>
            <span class="fail">Fail: ${formatNumber(apiFailCount)}</span>
            <span class="${getSuccessRateColorClass(apiSuccessRate)}">${apiSuccessRate}% success</span>
        </div>
    `;
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-US').format(number);
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