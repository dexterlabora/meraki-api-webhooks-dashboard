

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

function updateWebhookHistoryChart(webhookLogs, timespanSeconds, selectedUrl = null) {
    const ctx = document.getElementById('webhookHistoryChart').getContext('2d');
    const filteredLogs = selectedUrl ? webhookLogs.filter(log => log.url === selectedUrl) : webhookLogs;

    // Utilize the new getLabelFormat function to determine label formatting
    const labelFormat = getLabelFormat(timespanSeconds);

    // Group data by time using the more dynamic label format
    const groupedLogs = groupLogsByTime(filteredLogs, labelFormat);

    const labels = Object.keys(groupedLogs);
    const datasets = createDatasetsForWebhookLogs(groupedLogs);

    // Destroy previous chart instance if exists
    if (window.webhookHistoryChart && typeof window.webhookHistoryChart.destroy === 'function') {
        window.webhookHistoryChart.destroy();
    }
    
    console.log("updateWebhookHistoryChart labels, datasets", labels, datasets)
    window.webhookHistoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
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
    const responseCodes = new Set();
    Object.values(groupedLogs).forEach(logs => {
        logs.forEach(log => responseCodes.add(log.responseCode));
    });

    return Array.from(responseCodes).map(code => {
        const color = getColorForResponseCode(code);
        return {
            label: `Response Code ${code}`,
            backgroundColor: color,
            borderRadius: 10,
            data: Object.entries(groupedLogs).map(([key, logs]) => logs.filter(log => log.responseCode === code).length)
        };
    });
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


export default updateWebhookHistoryChart;
