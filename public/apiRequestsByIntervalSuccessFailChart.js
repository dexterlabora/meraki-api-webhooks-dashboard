// chart
const ctx = document.getElementById('apiRequestsByIntervalLineChart').getContext('2d');
let chart, apiDataCache = {}; // needed for dynamic charts, don't remove

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
    return formattedLabel;
}

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

function getResponseCodeDescription(code) {
    switch (true) {
        case /^2/.test(code.toString()):
            return "Success";
        case /^400$/.test(code.toString()):
            return "Client Error";
        case /^403$/.test(code.toString()):
            return "Forbidden";
        case /^404$/.test(code.toString()):
            return "Not Found";
        case /^429$/.test(code.toString()):
            return "Rate Limit Hit";
        case /^5/.test(code.toString()):
            return "Meraki Error";
        default:
            return "Other";
    }
}

function updateApiRequestsSuccessFailChart(data, timespanSeconds) {
    const labelFormat = getLabelFormat(timespanSeconds);
    const reversedData = [...data].reverse();

    // Filter and prepare datasets for success and failure
    const successData = [], failureData = [];
    reversedData.forEach(item => {
        let successCount = 0, failureCount = 0;
        item.counts.forEach(count => {
            if (/^2/.test(count.code)) {
                successCount += count.count;
            } else if (/^4/.test(count.code) || /^5/.test(count.code)) {
                failureCount += count.count;
            }
        });
        successData.push(successCount);
        failureData.push(failureCount);
    });

    const datasets = [
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
            fill: true,
            tension: .5,
            data: failureData
        }
    ];

    const labels = reversedData.map(item => {
        const date = dateFns.parseISO(item.startTs);
        return formatLabel(date, labelFormat);
    });

    if (window.apiRequestsByIntervalSuccessFailChart) {
        window.apiRequestsByIntervalSuccessFailChart.destroy();
    }

    window.apiRequestsByIntervalSuccessFailChart = new Chart(ctx, {
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
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true }
            }
        }
    });
    
    window.addEventListener('resize', function() {
        if (window.apiRequestsByIntervalSuccessFailChart) {
          window.apiRequestsByIntervalSuccessFailChart.resize();
        }
      });

}

export default updateApiRequestsSuccessFailChart;