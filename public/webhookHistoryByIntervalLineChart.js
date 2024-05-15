

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

function updateWebhookHistoryByIntervalLineChart(webhookLogs, timespanSeconds, selectedUrl = null) {
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
    
    console.log("updateWebhookHistoryByIntervalLineChart labels, datasets", labels, datasets)
    window.webhookRequestsByIntervalLineChart = new Chart(ctx, {
        type: 'line',
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
            fill: true,
            tension: 0.2,
            data: successData
            
        },
        {
            label: 'Failure',
            backgroundColor: 'red',
            borderColor: 'red',
            fill: true,
            tension: 0.2,
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


export default updateWebhookHistoryByIntervalLineChart;

// function getLabelFormat(timespanSeconds) {
//     // Defines how dates should be formatted based on the length of the timespan being viewed
//     if (timespanSeconds <= 7200) { // Less than or equal to 2 hours
//         return 'HH:mm'; // Show only hours and minutes
//     } else if (timespanSeconds <= 86400) { // One day
//         return 'HH:mm'; // Show month, day, and hour
//     } else if (timespanSeconds <= 604800) { // One week
//         return 'MMM dd'; // Show month and day
//     } else { // Longer than a week
//         return 'MMM'; // Show only month
//     }
// }

// function formatLabel(date, format) {
//     let formattedLabel;
//     switch (format) {
//         case 'HH:mm':
//             formattedLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
//             break;
//         case 'MMM dd HH:mm':
//             formattedLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
//             break;
//         case 'MMM dd':
//             formattedLabel = `${date.getMonth() + 1}/${date.getDate()}`;
//             break;
//         default:
//             formattedLabel = `${date.getMonth() + 1}/${date.getDate()}`;
//             break;
//     }
//     return formattedLabel;
// }

// function getColorForResponseCode(code) {
//     // Use regex to test the code and assign a color.
//     if (/^2/.test(code)) return 'green'; // Success responses.
//     if (/^429$/.test(code)) return 'red'; // Rate limits.
//     if (/^403$/.test(code)) return 'blue'; // Forbidden
//     if (/^404$/.test(code)) return 'grey'; // Not Found 
//     if (/^5/.test(code)) return 'brown'; // Server errors.
//     if (/^4/.test(code)) return 'orange'; // Client errors.
//     return 'grey'; // Default color.
// }

// function getResponseCodeDescription(code) {
//     switch (true) {
//         case /^2/.test(code.toString()):
//             return "Success";
//         case /^400$/.test(code.toString()):
//             return "Client Error";
//         case /^403$/.test(code.toString()):
//             return "Forbidden";
//         case /^404$/.test(code.toString()):
//             return "Not Found";
//         case /^429$/.test(code.toString()):
//             return "Rate Limit Hit";
//         case /^5/.test(code.toString()):
//             return "Meraki Error";
//         default:
//             return "Other";
//     }
// }

// function updateWebhookHistoryByIntervalLineChart(data, timespanSeconds) {
//     const ctx = document.getElementById('webhookRequestsByIntervalLineChart').getContext('2d');

//     // Use the same label format function as in webhookHistoryChart.js
//     const labelFormat = getLabelFormat(timespanSeconds);
//     const reversedData = [...data].reverse();

//     // Simplify data processing: Sum all counts regardless of response code
//     const totalData = reversedData.map(item => {
//         if (Array.isArray(item.counts)) {
//             return item.counts.reduce((acc, count) => acc + count.count, 0);
//         } else {
//             return 0; // Return 0 if counts are not an array
//         }
//     });

//     // Prepare datasets for success and failure
//     const successData = [];
//     const failureData = [];
//     reversedData.forEach(item => {
//         let successCount = 0;
//         let failureCount = 0;
//         if (Array.isArray(item.counts)) {
//             item.counts.forEach(count => {
//                 if (/^2/.test(count.responseCode)) { // Assuming 2xx codes are success
//                     successCount += count.count;
//                 } else {
//                     failureCount += count.count;
//                 }
//             });
//         }
//         successData.push(successCount);
//         failureData.push(failureCount);
//     });

//     const datasets = [
//         {
//             label: 'Success Requests',
//             backgroundColor: 'rgba(75, 192, 192, 0.5)',
//             borderColor: 'rgb(75, 192, 192)',
//             fill: false,
//             data: successData
//         },
//         {
//             label: 'Failure Requests',
//             backgroundColor: 'rgba(255, 99, 132, 0.5)',
//             borderColor: 'rgb(255, 99, 132)',
//             fill: false,
//             data: failureData
//         }
//     ];

//     const labels = reversedData.map(item => {
//         const date = dateFns.parseISO(item.sentAt);
//         return formatLabel(date, labelFormat);
//     });

//     // Destroy previous chart instance if exists, similar to webhookHistoryChart.js
//     if (window.webhookRequestsByIntervalLineChart  && typeof window.webhookRequestsByIntervalLineChart.destroy === 'function') {
//         window.webhookRequestsByIntervalLineChart.destroy();
//     }

//     window.webhookRequestsByIntervalLineChart = new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: labels,
//             datasets: datasets
//         },
//         options: {
//             scales: {
//                 x: {
//                     scaleLabel: {
//                         display: true,
//                         labelString: 'Date and Time'
//                     }
//                 },
//                 y: {
//                     beginAtZero: true
//                 }
//             },
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: {
//                 legend: { display: true }
//             }
//         }
//     });
// }

// export default updateWebhookHistoryByIntervalLineChart;