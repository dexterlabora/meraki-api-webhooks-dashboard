export function createApplicationsBarChart(applicationsData) {
    const ctx = document.getElementById('ApplicationsBarChart').getContext('2d');
    
    const data = applicationsData.map(app => ({
        userAgent: app.userAgent,
        successRequests: app.success,
        failureRequests: app.failure,
        successRate: parseFloat(app.successRate),
        busiestHour: app.busiestHours[0]?.name || 'N/A'
    }));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.userAgent),
            datasets: [
                {
                    label: 'Successful Requests',
                    data: data.map(item => item.successRequests),
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    yAxisID: 'y-axis-1',
                },
                {
                    label: 'Failed Requests',
                    data: data.map(item => item.failureRequests),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    yAxisID: 'y-axis-1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio,
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        callback: function(value) {
                            return this.getLabelForValue(value).split('/')[0];
                        }
                    }
                },
                'y-axis-1': {
                    stacked: true,
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Number of Requests'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            return `Success Rate: ${data[index].successRate}%\nBusiest Hour: ${data[index].busiestHour}`;
                        }
                    }
                }
            }
        }
    });
}