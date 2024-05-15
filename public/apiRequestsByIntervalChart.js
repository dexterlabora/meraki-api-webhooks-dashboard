
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

function updateApiRequestsChart(data, timespanSeconds) {
    // chart
    const ctx = document.getElementById('apiRequestsChart').getContext('2d');
    let chart, apiDataCache = {}; // needed for dynamic charts, don't remove

    // console.log("updateApiRequestsChart timespanSeconds, data ", timespanSeconds, data);
    const labelFormat = getLabelFormat(timespanSeconds);
    const reversedData = [...data].reverse();

    const responseCodes = new Set(reversedData.flatMap(item => item.counts.map(count => count.code)));
    const datasets = Array.from(responseCodes).map(code => ({
        label: `${getResponseCodeDescription(code)} (${code})`,
        backgroundColor: getColorForResponseCode(code),
        borderRadius: 5,
        data: reversedData.map(item => {
            const countObj = item.counts.find(count => count.code === code);
            return countObj ? countObj.count : 0;
        })
    }));

    const labels = reversedData.map(item => {
        const date = dateFns.parseISO(item.startTs);
        return formatLabel(date, labelFormat);
    });
    if (window.apiRequestsIntervalChart) {
        window.apiRequestsIntervalChart.destroy();
    }

    window.apiRequestsIntervalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    stacked: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Date and Time'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            }
        }
    });

}

export default updateApiRequestsChart;