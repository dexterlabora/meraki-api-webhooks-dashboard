export function updateWebhookHero(webhookData) {
    console.log("updateWebhookHero webhookData", webhookData)
    const webhookHeroInfo = document.querySelector('#webhookHeroInfo');  // Ensure this matches your actual HTML

    if (!webhookHeroInfo) {
        console.error('Webhook Metrics Info element not found.');
        return; // Exit the function if the element does not exist
    }
    if (webhookData.length < 1) {
        webhookHeroInfo.textContent = `No Data`;
        return;
    }

    // Compute success and fail counts
    const webhookSuccessCount = webhookData.filter(log => log.responseCode >= 200 && log.responseCode < 300).length;
    const webhookFailCount = webhookData.length - webhookSuccessCount;
    const webhookTotalCount = webhookSuccessCount + webhookFailCount;
    const webhookSuccessRate = webhookTotalCount > 0 ? ((webhookSuccessCount / webhookTotalCount) * 100).toFixed(2) : null;
    const successRateClass = getSuccessRateColorClass(webhookSuccessRate);
    webhookHeroInfo.innerHTML = `
        <div class="api-summary-label"><b>Webhooks Sent</b></div>
        <div class="api-summary-info">
            <span class="success">Success: ${formatNumber(webhookSuccessCount)}</span>
            <span class="fail">Fail: ${formatNumber(webhookFailCount)}</span>
            <span class="success-rate ${successRateClass}">${webhookSuccessRate}% success</span>
        </div>
    `;

    // Update the UI elements safely
    webhookHeroInfo.querySelector('.success').textContent = webhookSuccessCount ? `Success: ${formatNumber(webhookSuccessCount)}` : 'Success: 0';
    webhookHeroInfo.querySelector('.fail').textContent = webhookFailCount ? `Fail: ${formatNumber(webhookFailCount)}` : 'Fail: 0';
    webhookHeroInfo.querySelector('.success-rate').textContent = webhookSuccessRate ? `${webhookSuccessRate}% success` : 'No Data';
    webhookHeroInfo.querySelector('.success-rate').style.display = webhookSuccessRate ? 'block' : 'none'; // Hide the element if no data

    // Additional checks for element existence to avoid errors
    function formatNumber(number) {
        return number.toLocaleString();  // Make sure this function exists or handle formatting inline
    }
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