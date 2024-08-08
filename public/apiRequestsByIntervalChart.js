/**
 * API Requests by Interval Chart Generator
 * 
 * This module creates and updates a stacked bar chart visualizing API requests over time.
 * It processes time-series data of API requests, categorizing them by response codes.
 * 
 * Key features:
 * - Generates a stacked bar chart using Chart.js
 * - Dynamically formats time labels based on the timespan
 * - Sets the y-axis maximum to 10% above the maximum data value or the rate limit
 * - Indicates the Meraki API rate limit with a horizontal line annotation (10 calls per second)
 * - Color-codes response categories for easy visualization
 * - Provides tooltips with detailed information for each data point
 * 
 * Main functions:
 * - updateApiRequestsChart: Core function that creates/updates the chart
 * - getLabelFormat: Determines appropriate time format based on timespan
 * - formatLabel: Formats date labels for chart axes
 * - getColorForResponseCode: Assigns colors to different response code categories
 * - getResponseCodeDescription: Provides human-readable descriptions for response codes
 * 
 * This module is designed to be flexible, handling various timespans and dynamically
 * adjusting the chart's appearance and data representation accordingly.
 */

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
        case 'MMM dd':
            formattedLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate().toString().padStart(2, '0')}`;
            break;
        case 'MMM':
            formattedLabel = date.toLocaleString('default', { month: 'short' });
            break;
        default:
            formattedLabel = date.toLocaleString();
            break;
    }
    return formattedLabel;
}

function getColorForResponseCode(code) {
    // Use regex to test the code and assign a color.
    if (/^2/.test(code)) return 'rgba(103, 179, 70, 0.8)'; // Success responses (Meraki Green)
    if (/^429$/.test(code)) return 'rgba(254, 205, 8, 0.8)'; // Rate limits (Medium Yellow)
    if (/^403$/.test(code)) return 'rgba(98, 119, 226, 0.8)'; // Forbidden (Bright Blue)
    if (/^404$/.test(code)) return 'rgba(137, 139, 142, 0.8)'; // Not Found (Light Gray)
    if (/^5/.test(code)) return 'rgba(78, 75, 72, 0.8)'; // Server errors (Dark Gray)
    if (/^4/.test(code)) return 'rgba(98, 119, 226, 0.6)'; // Client errors (Bright Blue, lighter)
    return 'rgba(255, 255, 255, 0.8)'; // Default color (White)
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
    const ctx = document.getElementById('apiRequestsChart').getContext('2d');
    if (window.apiRequestsIntervalChart) {
        window.apiRequestsIntervalChart.destroy();
    }

    // Sort data by startTs
    data.sort((a, b) => new Date(a.startTs) - new Date(b.startTs));

    // Calculate the interval in seconds
    const intervalSeconds = (new Date(data[1].endTs) - new Date(data[1].startTs)) / 1000;

    const datasets = createDatasets(data);
    const labels = data.map(interval => formatLabel(new Date(interval.startTs), getLabelFormat(timespanSeconds)));

    // Calculate API budget (theoretical max calls per interval)
    const apiBudget = 10 * intervalSeconds;

    // Calculate usage percentage of API budget
    const usagePercentageData = data.map(interval => {
        const totalCalls = interval.counts.reduce((sum, count) => sum + count.count, 0);
        return (totalCalls / apiBudget) * 100;
    });

    // Add usage percentage dataset
    datasets.push({
        label: 'API Budget Usage (%)',
        data: usagePercentageData,
        type: 'line',
        borderColor: 'rgb(65, 175, 224)', // Bright Blue
        borderWidth: 2,
        fill: false,
        yAxisID: 'percentage'
    });

    const maxDataValue = Math.max(...data.map(interval => 
        interval.counts.reduce((sum, count) => sum + count.count, 0)
    ));

    const maxUsagePercentage = Math.max(...usagePercentageData);
    const minDisplayPercentage = 10; // Never scale below 10%
    const maxDisplayPercentage = Math.max(maxUsagePercentage * 1.1, minDisplayPercentage);

    window.apiRequestsIntervalChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio, // This ensures sharp rendering on high DPI displays
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Date and Time'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    max: Math.max(maxDataValue) * 1.1,
                    title: {
                        display: true,
                        text: 'Total API Calls'
                    }
                },
                percentage: {
                    position: 'right',
                    type: 'linear',
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'API Budget Usage (%)'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return value.toFixed(0) + '%';
                        },
                        stepSize: 20
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'API Requests by Response Code',
                    font: {
                        size: 16
                    }
                },
                subtitle: {
                    display: true,
                    text: 'API Budget calculated based on 10 calls/second rate limit',
                    font: {
                        size: 12,
                        style: 'italic'
                    },
                    padding: {
                        bottom: 10
                    }
                },
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const d = new Date(data[context[0].dataIndex].startTs);
                            return `${d.toLocaleString()} - ${new Date(d.getTime() + intervalSeconds * 1000).toLocaleString()}`;
                        },
                        footer: (tooltipItems) => {
                            const dataIndex = tooltipItems[0].dataIndex;
                            const intervalData = data[dataIndex];
                            const totalCalls = intervalData.counts.reduce((sum, count) => sum + count.count, 0);
                            const usagePercentage = usagePercentageData[dataIndex];
                            return `Total calls: ${totalCalls}\nAPI Budget Usage: ${usagePercentage.toFixed(2)}%\nAPI Budget: ${apiBudget} calls\n(Based on 10 calls/s limit)`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        budgetLine: {
                            type: 'line',
                            yScaleID: 'y',
                            yMin: apiBudget,
                            yMax: apiBudget,
                            borderColor: 'rgba(78, 75, 72, 0.8)', // Dark Gray
                            borderWidth: 1, // Thinner line
                            borderDash: [3, 3], // Shorter, more subtle dash
                            label: {
                                content: `API Budget: ${apiBudget} calls/${intervalSeconds}s`,
                                enabled: true,
                                position: 'end',
                                backgroundColor: 'rgba(78, 75, 72, 0.1)', // Dark Gray with low opacity
                                color: 'rgba(78, 75, 72, 1)', // Dark Gray
                                font: {
                                    style: 'italic',
                                    size: 11
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

function createDatasets(data) {
    const responseCodes = Array.from(new Set(data.flatMap(interval => interval.counts.map(count => count.code))));
    return responseCodes.map(code => ({
        label: `${getResponseCodeDescription(code)} (${code})`,
        backgroundColor: getColorForResponseCode(code),
        data: data.map(interval => {
            const count = interval.counts.find(c => c.code === code);
            return count ? count.count : 0;
        })
    }));
}

function formatIntervalLabel(intervalSeconds) {
    if (intervalSeconds < 60) return `${intervalSeconds} Seconds`;
    if (intervalSeconds < 3600) return `${intervalSeconds / 60} Minutes`;
    if (intervalSeconds < 86400) return `${intervalSeconds / 3600} Hours`;
    return `${intervalSeconds / 86400} Days`;
}

export default updateApiRequestsChart;