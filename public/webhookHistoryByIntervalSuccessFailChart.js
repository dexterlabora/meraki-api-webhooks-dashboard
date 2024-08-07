/**
 * Webhook History Success/Fail Chart Generator
 * 
 * This module creates and updates a bar chart visualizing the success and failure rates
 * of webhook deliveries over time. It uses Chart.js for rendering the chart.
 * 
 * Key features:
 * - Generates a stacked bar chart showing successful and failed webhook deliveries
 * - Dynamically adjusts time labels based on the selected timespan
 * - Supports filtering by specific webhook URLs
 * - Uses green for successful deliveries and red for failures
 * - Responsive design that adjusts to window resizing
 * 
 * Main functions:
 * - updateWebhookHistoryByIntervalSuccessFailChart: Core function to create/update the chart
 * - getLabelFormat: Determines appropriate time format based on timespan
 * - formatLabel: Formats date labels for chart axes
 * - groupLogsByTime: Processes webhook logs into time-based groups
 * - createDatasetsForWebhookLogs: Prepares data for Chart.js consumption
 * 
 * Note: This module requires Chart.js to be loaded in the global scope.
 * Ensure Chart.js is properly included in your project before using this module.
 */

// Check if Chart.js is available
if (typeof Chart === 'undefined') {
    throw new Error('Chart.js is not loaded but is required for webhookHistoryChart.js!');
}

// Determine the label format based on the timespan
function getLabelFormat(timespanSeconds) {
    // Defines how dates should be formatted based on the length of the timespan being viewed
    if (timespanSeconds <= 7200) { // Less than or equal to 2 hours
        return 'HH:mm'; // Show only hours and minutes
    } else if (timespanSeconds <= 86400) { // One day
        return 'HH:mm'; // Show month, day, and hour
    } else if (timespanSeconds <= 604800) { // One week
        return 'MMM dd'; // Show month and day
    } else { // Longer than a week
        return 'MMM'; // Show only month
    }
}

function formatLabel(date, format) {
    let formattedLabel;
    switch (format) {
        case 'HH:mm':
            formattedLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            break;
        case 'MMM dd HH:mm':
            formattedLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
            break;
        case 'MMM dd':
            formattedLabel = `${date.getMonth() + 1}/${date.getDate()}`;
            break;
        default:
            formattedLabel = `${date.getMonth() + 1}/${date.getDate()}`;
            break;
    }
   // console.log("Formatted label: ", formattedLabel);  // Check what's being returned
    return formattedLabel;
}

function updateWebhookHistoryByIntervalSuccessFailChart(webhookLogs, timespanSeconds, selectedUrl = null) {
    const ctx = document.getElementById('webhookRequestsByIntervalLineChart').getContext('2d');
    const filteredLogs = selectedUrl ? webhookLogs.filter(log => log.url === selectedUrl) : webhookLogs;

    // Utilize the new getLabelFormat function to determine label formatting
    const labelFormat = getLabelFormat(timespanSeconds);

    // Group data by time using the more dynamic label format
    const groupedLogs = groupLogsByTime(filteredLogs, labelFormat);

    const labels = Object.keys(groupedLogs);
    const datasets = createDatasetsForWebhookLogs(groupedLogs);

    // Destroy previous chart instance if exists
    if (window.webhookRequestsByIntervalLineChart && typeof window.webhookRequestsByIntervalLineChart.destroy === 'function') {
        window.webhookRequestsByIntervalLineChart.destroy();
    }
    
   // console.log("updateWebhookHistoryByIntervalSuccessFailChart labels, datasets", labels, datasets)
    window.webhookRequestsByIntervalLineChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    scaleLabel: {
                        display: true,
                        labelString: 'Date and Time'
                    }
                },
                y: {
                    
                    stacked: false
                }
            },
            responsive: true,
            pointRadius: .05,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
        }
    });

    window.addEventListener('resize', function() {
        if (window.webhookRequestsByIntervalLineChart) {
          window.webhookRequestsByIntervalLineChart.resize();
        }
      });

}

function groupLogsByTime(logs, labelFormat) {
    return logs.reduce((acc, log) => {
        const date = new Date(log.sentAt);
        const formattedDate = formatLabel(date, labelFormat);
        if (!acc[formattedDate]) {
            acc[formattedDate] = [];
        }
        acc[formattedDate].push(log);
        return acc;
    }, {});
}


function pad(number) {
    return number < 10 ? '0' + number : number;
}

function createDatasetsForWebhookLogs(groupedLogs) {
    let successData = [];
    let failureData = [];

    Object.entries(groupedLogs).forEach(([key, logs]) => {
        let successCount = 0;
        let failureCount = 0;
        logs.forEach(log => {
            if (/^2/.test(log.responseCode.toString())) {
                successCount++;
            } else {
                failureCount++;
            }
        });
        successData.push({ x: key, y: successCount });
        failureData.push({ x: key, y: failureCount });
    });

    return [
        {
            label: 'Success',
            backgroundColor: 'green',
            borderColor: 'green',
            fill: false,
            tension: .5,
            data: successData
            
        },
        {
            label: 'Failure',
            backgroundColor: 'red',
            borderColor: 'red',
            fill: false,
            tension: .5,
            data: failureData
        }
    ];
}

// Ensure color coding for response codes is consistent
function getColorForResponseCode(code) {
    // Use regex to test the code and assign a color.
    if (/^2/.test(code)) return 'green'; // Success responses.
    if (/^429$/.test(code)) return 'red'; // Rate limits.
    if (/^403$/.test(code)) return 'blue'; // Forbidden
    if (/^404$/.test(code)) return 'grey'; // Not Found 
    if (/^5/.test(code)) return 'brown'; // Server errors.
    if (/^4/.test(code)) return 'orange'; // Client errors.
    return 'grey'; // Default color.
}



// Example HTML for URL Selector
// In your HTML file add a select element inside a suitable container
// <select id="urlSelect"></select>


export default updateWebhookHistoryByIntervalSuccessFailChart;