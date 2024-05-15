import { setupTableSortListeners } from './tableSorter.js';

// *******************
// API Request Metrics 
// *******************

function truncateUserAgent(userAgent) {
    return userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
}

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

// ******************
// ** Summary Card ** 
// ******************

const createSummaryCard = (summary) => {
    let content = `<div class="summary-card">
      <h3>Summary</h3>
      <div class="summary-content">`;

    if (summary.anomalies.length > 0) {
        content += `<div class="summary-section">
            
            <ul>`;
        summary.anomalies.forEach(anomaly => {
            content += createSummaryListItem(anomaly);
        });
        content += `</ul>
        </div>`;
    }

    content += `</div></div>`;

    return content;
};
// Create summary list items with formatting and color coding
function createSummaryListItem(text) {
    // Separate the text into parts to isolate the operation and the success rate
    const parts = text.match(/(.*): (.*) with a success rate of (.*)%/);
    if (parts && parts.length === 4) {
        const operation = parts[2];
        const rate = parts[3] + '%'; // Re-add the % symbol
        const rateClass = getSuccessRateColorClass(rate);
        // Return HTML string with operation in code tags and rate span with color class
        return `<li><span class="label">${parts[1]}:</span> <code>${operation}</code> with a success rate of <span class="${rateClass}">${rate}</span></li>`;
    } else {
        // If the text doesn't match the expected format, return it without special formatting
        return `<li>${text}</li>`;
    }
}

// ******************
// ** Metrics Card **
// ******************

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

// ***********************
// ** Applications Card ** 
// ***********************

// const createApplicationsCard = (applicationsData) => {

//     let content = `
//         <div class="metric-card applications-card">
//             <h3>Applications</h3>
//             <table class="sortable-table">
//                 <thead>
//                     <tr class="metric-item-header">
//                         <th>Details</th>
//                         <th>User Agent</th>
//                         <th>Admins</th>
//                         <th>Operations</th>
//                         <th>Source IPs</th>
//                         <th>Success / Fail </th>
//                         <th>Success Rate</th>
//                         <th>Busiest Hours</th>              
//                     </tr>
//                 </thead>
//                 <tbody>`;

//     applicationsData.forEach(app => {

//         // Get the appropriate color class for success rate
//         const rateClass = getSuccessRateColorClass(app.successRate);
//         content += `
//         <tr class="metric-item">
//             <td> <button class="expand-link" style="float: left;"><i alt="Expand" class="fa fa-chevron-down"></i></button></td>
//             <td>${truncateUserAgent(app.userAgent) || "Unknown"}      
//             </td>
//             <td>${app.admins.length} ${createExpandableList(app.admins, "Admins")}</td>
//             <td>${app.operations.length} ${createExpandableList(app.operations, "Operation")}</td>
//             <td>${app.sourceIps.length} ${createExpandableList(app.sourceIps, "Source IP")}</td>
//             <td class="metric-value">${app.success} / ${app.failure}</td>
//             <td class="metric-percent ${rateClass}">${app.successRate}</td>
//             <td>${app.busiestHours[0]?.name} ${createExpandableList(app.busiestHours, "Busiest Hours")}</td>
//         </tr>`;
//     });

//     content += `</tbody></table></div>`;
//     return content;
// };

// Adding a non-sortable class to the Details header
const createApplicationsCard = (applicationsData) => {
    let content = `
        <div class="metric-card applications-card">
            <h3>Applications</h3>
            <table >
                <thead>
                    <tr class="metric-item-header">
                        <th>Details</th>
                        <th>User Agent</th>
                        <th>Admins</th>
                        <th>Operations</th>
                        <th>Source IPs</th>
                        <th>Success / Fail</th>
                        <th>Success Rate</th>
                        <th>Busiest Hours</th>              
                    </tr>
                </thead>
                <tbody>`;

    applicationsData.forEach((app, index) => {
        const rateClass = getSuccessRateColorClass(app.successRate);
        content += `
        <tr class="metric-item">
            <td><button class="expand-link" style="float: left;"><i alt="Expand" class="fa fa-chevron-down"></i></button></td>
            <td>${truncateUserAgent(app.userAgent) || "Unknown"}</td>
            <td>${app.admins.length} ${createExpandableList(app.admins, "Admins", index)}</td>
            <td>${app.operations.length} ${createExpandableList(app.operations, "Operation", index)}</td>
            <td>${app.sourceIps.length} ${createExpandableList(app.sourceIps, "Source IP", index)}</td>
            <td class="metric-value">${app.success} / ${app.failure}</td>
            <td class="metric-percent ${rateClass}">${app.successRate}</td>
            <td>${app.busiestHours[0]?.name} ${createExpandableList(app.busiestHours, "Busiest Hours", index)}</td>
        </tr>`;
    });

    content += `</tbody></table></div>`;
    return content;
};


const setupDynamicTableListeners = (applicationsData) => {
    applicationsData.forEach((app, index) => {
        const adminTableId = `Admins${index}`;
        const operationsTableId = `Operations${index}`;
        const sourceIPsTableId = `SourceIPs${index}`;
        const busiestHoursTableId = `BusiestHours${index}`;

        setupTableSortListeners(`#${adminTableId}`);
        setupTableSortListeners(`#${operationsTableId}`);
        setupTableSortListeners(`#${sourceIPsTableId}`);
        setupTableSortListeners(`#${busiestHoursTableId}`);
    });
};




// Expand Metric Card Links
document.addEventListener('DOMContentLoaded', (event) => {
    const container = document.getElementById('apiMetricsContainer');

    container.addEventListener('click', (event) => {
        if (event.target.closest('.expand-link')) {
            event.preventDefault(); // Prevent the default anchor behavior

            const metricItem = event.target.closest('.metric-item');
            const expandableContents = metricItem.querySelectorAll('.expandable-content');
            const icon = event.target.closest('.expand-link').querySelector('.fa');
            const isExpanded = icon.classList.contains('fa-chevron-up');

            // Toggle visibility of all expandable content in the row
            expandableContents.forEach(content => {
                content.style.display = isExpanded ? 'none' : 'block';
            });

            // Toggle the icon
            if (isExpanded) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                icon.setAttribute('alt', 'Expand');
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                icon.setAttribute('alt', 'Collapse');
            }
            
        }
    });


});


// Application Card helper
// const createExpandableList = (list, title) => {
//     console.log("createExpandableList title", title)
//     let tableContent = `<table class="sortable-table" id="${title}ExpandedMetricContainer">
//         <thead>
//             <tr>`;

//     if (title === 'Admins') {
//         tableContent += `<th>Admins</th>`;
//     } else {
//         tableContent += `<th>${title}</th>`;
//     }
//     tableContent += `<th>Success</th><th>Fail</th><th>Success Rate</th></tr>
//         </thead>
//         <tbody>`;

//     list.forEach(item => {
//         const rateClass = getSuccessRateColorClass(item.successRate);

//         tableContent += `
//             <tr>
//                 <td>${title === 'Admins' ? item.details : item.name}</td>
//                 <td>${item.success}</td>
//                 <td class="${getFailureRateColorClass(item.failure)}">${item.failure}</td>
//                 <td class="${rateClass}">${item.successRate}</td>
//             </tr>`;
//     });

//     tableContent += `</tbody></table>`;
//     return `<div class="expandable-content" style="display: none;">${tableContent}</div>`;

// };

// Adding unique IDs to each nested table
const createExpandableList = (list, title, index) => {
    const uniqueId = title.replace(/\s+/g, '') + index;  // Unique ID based on title and index
    let tableContent = `<table id="${uniqueId}">
        <thead><tr><th>${title}</th><th>Success</th><th>Fail</th><th>Success Rate</th></tr></thead>
        <tbody>`;

    list.forEach(item => {
        const rateClass = getSuccessRateColorClass(item.successRate);
        tableContent += `
            <tr>
                <td>${title === 'Admins' ? item.details : item.name}</td>
                <td>${item.success}</td>
                <td>${item.failure}</td>
                <td class="${rateClass}">${item.successRate}</td>
            </tr>`;
    });

    tableContent += `</tbody></table>`;
    return `<div class="expandable-content" style="display: none;">${tableContent}</div>`;
};


const createPieChart = (title) => {
    return `
    <div  id="${title}Container">
        <div class="metric-pie-chart">
        <canvas id="${title}Chart" ></canvas>
        </div>
    </div>`;
}

// Assuming this function is called with the necessary User Agent data
function preparePieChartData(items) {
    const labels = items.map(item => truncateUserAgent(item.name));
    const successData = items.map(item => item.success);
    const failureData = items.map(item => item.failure);

    return { labels, successData, failureData };
}
function renderUserAgentPieChart(title, data) {
    const ctx = document.getElementById(`${title}Chart`).getContext('2d');
    const labels = data.labels.map(label => truncateUserAgent(label));
    //  ctx.canvas.width = 900; // Set width of the canvas
    ctx.canvas.height = 200;  // Set height of the canvas

    const pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{

                label: 'API Requests by User Agent',
                data: data.successData,  // Assuming you want to plot successData; change accordingly
                // backgroundColor: [
                //     'rgba(255, 99, 132, 0.2)', 
                //     'rgba(54, 162, 235, 0.2)',
                //     'rgba(255, 206, 86, 0.2)',
                //     // Add more colors as needed
                // ],
                // borderColor: [
                //     'rgba(255, 99, 132, 1)',
                //     'rgba(54, 162, 235, 1)',
                //     'rgba(255, 206, 86, 1)',
                //     // Add more colors as needed
                // ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 2,
            plugins: {
                title: {
                    display: true,
                    text: "API Usage by Application (User Agent)",//title,
                    padding: {
                        top: 10,
                        bottom: 10
                    },
                    postion: 'left',
                    align: 'start'
                },
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const labelIndex = context.dataIndex; // Get index of current data
                            const fullLabel = data.labels[labelIndex]; // Get full label from original data
                            const value = context.raw;
                            // Compute total using reduce
                            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                            const percentage = ((value / total) * 100).toFixed(2) + '%';
                            //  return `${fullLabel}: ${value} (${percentage})`; // Show full label in tooltip
                            return `API Requests: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
}



// *******************
// Display all Metrics
// *******************

const displayMetrics = (metrics) => {


    console.log("apiRequestsMetricsViz.js metrics", metrics)
    if (!metrics) {
        console.log("no metrics")
        return
    };
    const container = document.getElementById('apiMetricsContainer');
    container.innerHTML = ''; // Clear previous content

    // Append cards for each metric category

    // Summary
    container.innerHTML += createSummaryCard(metrics['Summary']);
    container.innerHTML += createPieChart("User Agents", metrics['User Agents']);
    // WHY
    container.innerHTML += createApplicationsCard(metrics['Applications'])

    // WHO
    container.innerHTML += createMetricsCard('Admins', metrics['Admins'], ['Name', 'Success / Fail', 'Rate']);
    container.innerHTML += createMetricsCard('User Agents', metrics['User Agents'], ['Name', 'Success / Fail', 'Rate']);
    // WHAT
    container.innerHTML += createMetricsCard('Operations', metrics['Operation IDs'], ['ID', 'Success / Fail', 'Rate']);
    // WHEN
    container.innerHTML += createMetricsCard('Busiest Times', metrics['Busiest Hours'], ['Hours', 'Success / Fail', 'Rate']);
    container.innerHTML += createMetricsCard('Busiest Days', metrics['Busiest Days'], ['Hours', 'Success / Fail', 'Rate']);
    // WHERE
    container.innerHTML += createMetricsCard('Source IPs', metrics['Source IPs'], ['IP Address', 'Success / Fail', 'Rate']);


    const userAgentChartData = preparePieChartData(metrics["User Agents"]);
    renderUserAgentPieChart("User Agents", userAgentChartData);

    setupTableSortListeners('#apiMetricsContainer');
    //setupDynamicTableListeners(metrics['Applications']);

   

};



export default displayMetrics