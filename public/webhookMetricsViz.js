// Visualization functions for webhook metrics
import getWebhookMetrics from './webhookMetrics.js';
import { setupTableSortListeners } from './tableSorter.js';



// Helper Functions
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

function getFailureRateColorClass(failureCount) {
    if (failureCount >= 50) {
        return 'rate-fail';  // High number of failures
    } else if (failureCount > 0) {
        return 'rate-warning';  // Some failures
    } else {
        return '';  // No failures
    }
}

export const displayWebhookMetrics = (webhookData) => {
    const metrics = getWebhookMetrics(webhookData);
    const container = document.getElementById('webhookMetricsContainer');
    container.innerHTML = ''; // Clear previous content

    // Append summary cards for each metric -- DYNAMIC - but meh
    // Object.keys(metrics).forEach(key => {
    //     container.innerHTML += createMetricsCard(key, metrics[key], ['Name', 'Success / Fail', 'Rate']);
    // });

        console.log("webhookmetrics metrics", metrics)
        // WHO
        container.innerHTML += createMetricsCard('Webhook Receivers', metrics['URLs'], ['URL', 'Success / Fail', 'Rate']);
        
        // WHERE
        container.innerHTML += createMetricsCard('Networks', metrics['Networks'], ['Network', 'Success / Fail', 'Rate']);
        // WHAT
        container.innerHTML += createMetricsCard('Alert Types', metrics['Alert Types'], ['Alert Type', 'Success / Fail', 'Rate']);
        // WHEN
        container.innerHTML += createMetricsCard('Busiest Times', metrics['Busiest Hours'], ['Hours', 'Success / Fail', 'Rate']);
        container.innerHTML += createMetricsCard('Busiest Days', metrics['Busiest Days'], ['Hours', 'Success / Fail', 'Rate']);
 
        setupTableSortListeners('#webhookMetricsContainer');
};

const createMetricsCard = (title, data, headers) => {
    const content = `
        <div class="metric-card">
            <h3>${title}</h3>
            <div class="metric-scrollable">
              ${createFormattedTable(data, headers)}
            </div>
        </div>
    `;
    return content;
};

const createFormattedTable = (data, headers) => {
    const truncate = (item) => item.length > 40 ? item.substring(0, 40) + '...' : item;

    let content = `<table class="sortable-table"><thead><tr>`;

    // Create table headers
    headers.forEach(header => {
        content += `<th>${header}</th>`;
    });

    content += `</tr></thead><tbody>`;

    // Create table rows
    data.forEach(item => {
        // Get the appropriate color class for success rate
        let rateClass = getSuccessRateColorClass(item.successRate);
        content += `
        <tr class="metric-item" title="${item.name}">
        <td class="metric-label">${item.adminDetails || truncate(item.name)}</td>
        <td class="metric-value">${item.success} / ${item.failure}</td>
          <td class="metric-percent ${rateClass}">${item.successRate}</td>
        </tr>
      `;
    });

    content += `</tbody></table>`;
    return content;
};

export default displayWebhookMetrics