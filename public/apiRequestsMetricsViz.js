/**
 * API Requests Metrics Visualization
 * 
 * This module handles the visualization of API request metrics data.
 * It creates and updates various UI components to display metrics and analytics
 * in a user-friendly format.
 * 
 * Key features:
 * - Creates summary cards for quick overview of anomalies and key metrics
 * - Generates detailed metric cards for various data categories (e.g., Admins, Operations, User Agents)
 * - Produces interactive and sortable tables for detailed data exploration
 * - Creates pie charts for visual representation of data distribution
 * - Handles dynamic content expansion for detailed views
 * 
 * Main functions:
 * - displayMetrics: Core function that orchestrates the creation of all visualization components
 * - createSummaryCard: Generates a summary of detected anomalies
 * - createMetricsCard: Creates detailed metric cards for various data categories
 * - createApplicationsCard: Produces an interactive card for application-specific metrics
 * - renderUserAgentPieChart: Generates a pie chart for User Agent distribution
 * 
 * This module works in conjunction with external libraries (e.g., Chart.js) for advanced visualizations
 * and relies on DOM manipulation for creating and updating UI components.
 */

import { setupTableSortListeners } from './tableSorter.js';
import { createApplicationsBarChart } from './apiRequestsMetricsApplicationsBarChart.js';

// *******************
// API Request Metrics 
// *******************

const truncateUserAgent = (userAgent) => {
    return userAgent.length > 40 ? userAgent.substring(0, 40) + '...' : userAgent;
};

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
// ** Summary Analysis Card ** 
// ******************

const createSummaryCard = (summary) => {
    let content = `
    <div class="analysis-container">
        <div class="summary">
            <h3 class="summary-title">Summary</h3>
            <div class="summary-content">
                ${createOverallStats(summary.overallStats)}
                ${createBusiestTimesSection(summary.busiestDays, summary.busiestHours)}
                ${createTopOperationsSection(summary.topSuccessOperations, summary.topFailureOperations)}
                ${createMostActiveSection(summary.mostActiveAdmins, summary.mostActiveIPs)}
            </div>
            <button id="expandDetailsBtn" class="expand-details-btn">
                Expand Details <i class="fa fa-chevron-down"></i>
            </button>
        </div>
    </div>`;
    return content;
};

const createOverallStats = (stats) => `
    <div class="overall-stats">
        <h4 class="section-header">Overall Statistics</h4>
        <p>Total Success: ${stats.totalSuccess}</p>
        <p>Total Failure: ${stats.totalFailure}</p>
        <p>Overall Success Rate: <span class="${getSuccessRateColorClass(stats.overallSuccessRate)}">${stats.overallSuccessRate}</span></p>
    </div>`;

const createBusiestTimesSection = (busiestDays, busiestHours) => `
    <div class="busiest-times-section">
        <h4 class="section-header">Busiest Times</h4>
        ${createMetricSection('Busiest Days', busiestDays)}
        ${createMetricSection('Busiest Hours', busiestHours)}
    </div>
`;

const createTopOperationsSection = (topSuccessOperations, topFailureOperations) => `
    <div class="top-operations-section">
        <h4 class="section-header">Top Operations</h4>
        ${createTopOperations('Top Successes', topSuccessOperations)}
        ${createTopOperations('Top Failures', topFailureOperations)}
    </div>
`;

const createMostActiveSection = (mostActiveAdmins, mostActiveIPs) => `
    <div class="most-active-section">
        <h4 class="section-header">Most Active</h4>
        ${createMetricSection('Admins', mostActiveAdmins)}
        ${createMetricSection('IPs', mostActiveIPs)}
    </div>
`;

const createTopOperations = (title, operations) => `
    <div class="metric-section">
        <h5 class="subsection-header">${title}</h5>
        <ul class="operation-list">
            ${operations.map(op => `
                <li>
                    <code class="operation-name">${op.name}</code>
                    <span class="operation-stats">${op.success} / ${op.failure} 
                    (<span class="${getSuccessRateColorClass(op.successRate)}">${op.successRate}</span>)</span>
                </li>
            `).join('')}
        </ul>
    </div>`;

const createMetricSection = (title, items) => `
    <div class="metric-section">
        <h5 class="subsection-header">${title}</h5>
        <ul class="metric-list">
            ${items.map(item => `
                <li>
                    <span class="metric-name">${item.name}</span>
                    <span class="metric-stats">${item.success} / ${item.failure} 
                    (<span class="${getSuccessRateColorClass(item.successRate)}">${item.successRate}</span>)</span>
                </li>
            `).join('')}
        </ul>
    </div>`;

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
    const truncate = (item) => item.length > 50 ? item.substring(0, 50) + '...' : item;

    let content = `<table class="sortable-table"><thead><tr>`;

    // Create table headers
    headers.forEach(header => {
        content += `<th>${header}</th>`;
    });

    content += `</tr></thead><tbody>`;

    // Create table rows
    data.forEach(item => {
        let rateClass = getSuccessRateColorClass(item.successRate);
        // Highlight operationId if deprecated
        const operationClass = item?.deprecated ? 'deprecated' : '';
        content += `
            <tr class="metric-item" title="${item.description || item.name }">
                <td class="metric-label"> ${item.adminDetails || truncate(item.name)} <b class="${operationClass}">${operationClass.toUpperCase()}</b> </td>
                ${item.description ? `<td class="metric-description">${item.description}</td>` : ''}
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


// Adding a non-sortable class to the Details header
const createApplicationsCard = (applicationsData) => {
    let content = `
        <div class="metric-card applications-card">
            <h3>Applications</h3>
            <div class="applications-content">
                <div class="charts-container">
                    <div class="metric-pie-chart">
                        <canvas id="User AgentsChart">Pie Chart</canvas>
                    </div>
                    <div class="metric-bar-chart">
                        <canvas id="ApplicationsBarChart">Bar Chart</canvas>
                    </div>
                </div>
                <div class="table-container">
                    <table>
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
            <td>${app.operations.length} ${createExpandableList(app.operations, "Operations", index)}</td>
            <td>${app.sourceIps.length} ${createExpandableList(app.sourceIps, "Source IPs", index)}</td>
            <td class="metric-value">${app.success} / ${app.failure}</td>
            <td class="metric-percent ${rateClass}">${app.successRate}</td>
            <td>${app.busiestHours[0]?.name} ${createExpandableList(app.busiestHours, "Busiest Hours", index)}</td>
        </tr>`;
    });

    content += `</tbody></table></div></div></div>`;
    return content;
};

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
                <td class="metric-label">${item.details || item.name}</td>
                <td>${item.success}</td>
                <td>${item.failure}</td>
                <td class="${rateClass}">${item.successRate}</td>
            </tr>`;
    });

    tableContent += `</tbody></table>`;
    return `<div class="expandable-content" style="display: none;">${tableContent}</div>`;
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

    // Handler for summary card expandable sections
    container.addEventListener('click', (event) => {
        const expandLink = event.target.closest('.summary .expand-link');
        if (expandLink) {
            event.preventDefault();
            const listItem = expandLink.closest('li');
            const expandableContent = listItem.querySelector('.expandable-content');
            const icon = expandLink.querySelector('.fa');

            toggleExpandableContent(expandableContent, icon);
        }
    });

    // Handler for applications card expandable sections
    container.addEventListener('click', (event) => {
        const expandLink = event.target.closest('.applications-card .expand-link');
        if (expandLink) {
            event.preventDefault();
            const metricItem = expandLink.closest('.metric-item');
            const expandableContents = metricItem.querySelectorAll('.expandable-content');
            const icon = expandLink.querySelector('.fa');

            expandableContents.forEach(content => {
                toggleExpandableContent(content, icon);
            });
        }
    });
});

// Helper function to toggle expandable content
function toggleExpandableContent(content, icon) {
    const isExpanded = content.style.display === 'block';
    content.style.display = isExpanded ? 'none' : 'block';

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
    ctx.canvas.height = 300;  // Set a fixed height for the pie chart

    const pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{

                label: 'API Requests by User Agent',
                data: data.successData,  
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "API Usage by Application (User Agent)",
                    padding: {
                        top: 10,
                        bottom: 10
                    },
                    
                    align: 'center'
                },
                legend: {
                    position: 'right',
                    display: false // 
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
    console.log("apiRequestsMetricsViz.js metrics", metrics);

    if (!metrics) {
        console.log("no metrics");
        return;
    }

    const container = document.getElementById('apiMetricsContainer');
    container.innerHTML = ''; // Clear previous content

    // Create and append the Applications card (shown by default)
    container.innerHTML += createApplicationsCard(metrics['Applications']);
    
    // Append summary card
    container.innerHTML += createSummaryCard(metrics['Summary']);

    // Create a div to hold all the detailed metrics cards
    const detailedMetricsContainer = document.createElement('div');
    detailedMetricsContainer.id = 'detailedMetricsContainer';
    detailedMetricsContainer.className = 'metrics-container';
    detailedMetricsContainer.style.display = 'none'; // Initially hidden

    // Append cards for each metric category to the detailed metrics container
    detailedMetricsContainer.innerHTML += createMetricsCard('Admins', metrics['Admins'], ['Name', 'Success / Fail', 'Rate']);
    detailedMetricsContainer.innerHTML += createMetricsCard('User Agents', metrics['User Agents'], ['Name', 'Success / Fail', 'Rate']);
    detailedMetricsContainer.innerHTML += createMetricsCard('Operations', metrics['Operations'], ['ID', "Description", 'Success / Fail', 'Rate']);
    detailedMetricsContainer.innerHTML += createMetricsCard('Busiest Times', metrics['Busiest Hours'], ['Hours', 'Success / Fail', 'Rate']);
    detailedMetricsContainer.innerHTML += createMetricsCard('Busiest Days', metrics['Busiest Days'], ['Hours', 'Success / Fail', 'Rate']);
    detailedMetricsContainer.innerHTML += createMetricsCard('Source IPs', metrics['Source IPs'], ['IP Address', 'Success / Fail', 'Rate']);

    // Append the detailed metrics container to the main container
    container.appendChild(detailedMetricsContainer);

    // Add event listener for the expand details button
    const expandDetailsBtn = document.getElementById('expandDetailsBtn');
    expandDetailsBtn.addEventListener('click', () => {
        const detailedMetrics = document.getElementById('detailedMetricsContainer');
        const icon = expandDetailsBtn.querySelector('i');
        if (detailedMetrics.style.display === 'none') {
            detailedMetrics.style.display = 'flex'; // Change to flex to activate the flex layout
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
            expandDetailsBtn.textContent = 'Collapse Details ';
            expandDetailsBtn.appendChild(icon);
            
            // Scroll to the detailed metrics section
            detailedMetrics.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Add highlight animation
            detailedMetrics.classList.add('highlight-animation');
            setTimeout(() => {
                detailedMetrics.classList.remove('highlight-animation');
            }, 1500); // Remove the animation class after 1.5 seconds
        } else {
            detailedMetrics.style.display = 'none';
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
            expandDetailsBtn.textContent = 'Expand Details ';
            expandDetailsBtn.appendChild(icon);
        }
    });

    // Create both charts after the DOM has been updated
    setTimeout(() => {
        createApplicationsBarChart(metrics['Applications']);
        const userAgentChartData = preparePieChartData(metrics["User Agents"]);
        renderUserAgentPieChart("User Agents", userAgentChartData);
    }, 0);

    setupTableSortListeners('#apiMetricsContainer');
};



export default displayMetrics