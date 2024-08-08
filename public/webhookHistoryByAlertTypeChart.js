/**
 * Webhook History by Alert Type Chart Generator
 * 
 * This module creates and updates a stacked bar chart visualizing webhook history
 * categorized by alert types. It uses Chart.js for rendering the chart.
 * 
 * Key features:
 * - Generates a stacked bar chart showing webhook counts by alert type over time
 * - Dynamically adjusts time labels based on the selected timespan
 * - Supports filtering by specific webhook URLs
 * - Uses Meraki branding colors for common alert types
 * - Generates dynamic colors for unknown alert types
 * 
 * Main functions:
 * - updateWebhookHistoryByAlertTypeChart: Core function to create/update the chart
 * - getLabelFormat: Determines appropriate time format based on timespan
 * - groupDataByAlertType: Processes webhook logs into chart-ready data structure
 * - getColorForAlertType: Assigns colors to different alert types
 * - generateDynamicColor: Creates colors for unknown alert types
 * 
 * Note: This module requires Chart.js to be loaded in the global scope.
 * Ensure Chart.js is properly included in your project before using this module.
 */

// Check if Chart.js is loaded
if (typeof Chart === 'undefined') {
    throw new Error('Chart.js is not loaded but is required for this chart module!');
}

const ctx = document.getElementById('webhookHistoryByAlertTypeChart').getContext('2d');
let webhookAlertTypeChart;


// Determine label format based on the timespan in seconds
function getLabelFormat(timespanSeconds) {
    if (timespanSeconds <= 86400) { // Day view
        return 'HH:mm'; // Hours and minutes
    } else if (timespanSeconds <= 604800) { // Week view
        return 'MM-DD HH:mm'; // Month-Day and Hours
    } else { // Month view or longer
        return 'MM-DD'; // Month-Day
    }
}

export function updateWebhookHistoryByAlertTypeChart(webhookLogs, timespanSeconds, selectedUrl = null) {
    console.log("updateWebhookHistoryByAlertTypeChart", timespanSeconds, selectedUrl)
    const labelFormat = getLabelFormat(timespanSeconds);
    const filteredLogs = selectedUrl ? webhookLogs.filter(log => log.url === selectedUrl) : webhookLogs;
    // Group data by alert type and time
    const data = groupDataByAlertType(filteredLogs, timespanSeconds, labelFormat);


    // Ensure the correct destruction of previous chart instance if it exists
    if (webhookAlertTypeChart && typeof webhookAlertTypeChart.destroy === 'function') {
        webhookAlertTypeChart.destroy();
    }
    webhookAlertTypeChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                legend: { display: true }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

}

function groupDataByAlertType(logs, timespanSeconds, labelFormat) {
    const isDayView = timespanSeconds <= 86400; // 86400 seconds in a day

    const formatKey = (date) => {
        const dt = new Date(date);
        return isDayView ? `${dt.getHours()}:00` : `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
    };

    const alertTypes = new Set();
    const countsByTypeAndTime = {};

    logs.forEach(log => {
        const timeKey = formatKey(log.sentAt, labelFormat);
        const type = log.alertType || 'Unknown';
        alertTypes.add(type);

        if (!countsByTypeAndTime[timeKey]) {
            countsByTypeAndTime[timeKey] = {};
        }
        if (!countsByTypeAndTime[timeKey][type]) {
            countsByTypeAndTime[timeKey][type] = 0;
        }
        countsByTypeAndTime[timeKey][type]++;
    });

    const labels = Object.keys(countsByTypeAndTime).sort();
    const datasets = Array.from(alertTypes).map(type => {
        const data = labels.map(label => countsByTypeAndTime[label][type] || 0);
        const color = getColorForAlertType(type);
        return {
            label: type,
            data: data,
            backgroundColor: color,
            borderRadius: 10,
            stack: 'Stack 0'
        };
    });

    return {
        labels,
        datasets
    };
}

function getColorForAlertType(type) {
    // Meraki branding colors
    const merakiColors = {
        'Motion detected': 'rgba(0, 126, 138, 0.5)', // ocean blue
        'Sensor change detected': 'rgba(242, 169, 0, 0.5)', //  sunflower yellow
        'Client connectivity changed': 'rgba(237, 85, 101, 0.5)', //  coral red
    };

    // Return predefined colors or dynamically generate one
    return merakiColors[type] || generateDynamicColor(type);
}
function generateDynamicColor(type) {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert integer hash value to a color
    const hue = hash % 360; // Hue value wrapped around 360
    return `hsla(${hue}, 70%, 70%, 0.5)`; // Generate an HSL color with a fixed saturation and lightness
}