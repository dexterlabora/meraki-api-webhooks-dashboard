// Constants and State
const MAX_PAGE_LIMIT = 2; // Default max pages to paginate API

import API from './apiHandlers.js';
import apiRequestsMetricsViz from './apiRequestsMetricsViz.js';
import apiRequestsMetrics from './apiRequestsMetrics.js';
import webhookMetricsViz from './webhookMetricsViz.js';
import updateWebhookHistoryChart from './webhookHistoryChart.js';
import updateWebhookHistoryByIntervalSuccessFailChart from './webhookHistoryByIntervalSuccessFailChart.js';
import updateApiRequestsChart from './apiRequestsByIntervalChart.js';
import updateApiRequestsSuccessFailChart from './apiRequestsByIntervalSuccessFailChart.js';
import { updateWebhookHistoryByAlertTypeChart } from './webhookHistoryByAlertTypeChart.js';
import { fetchApiKeys } from './apiKeyMgmt.js';
import { setupTableSortListeners } from './tableSorter.js';
import { init as initWebhookReceivers } from './webhookReceivers.js';
import { init as initWebhookTemplates } from './webhookTemplates.js';

// configs
const apiKeyInput = document.getElementById('apiKey');
const organizationSelect = document.getElementById('organizationSelect');
const configModal = document.getElementById('configModal');
const configToggle = document.getElementById('configToggle');
const closeModal = document.querySelector('.close');
const loader = document.getElementById('loader');

// Global Variables
let webhookLogsData = [];


// Load stored API key and Org ID
function loadStoredConfig() {
    if (localStorage.getItem('MerakiApiKey')) {
        apiKeyInput.value = localStorage.getItem('MerakiApiKey');

        fetchOrganizations();

    }
    if (localStorage.getItem('MerakiOrganizationId')) {
        organizationSelect.value = localStorage.getItem('MerakiOrganizationId');
    }
}

// Config Form Submit Handler
function handleConfigFormSubmit(event) {
    event.preventDefault();
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
        displayNotification("API Key is required!");
        return;
    }
    localStorage.setItem('MerakiApiKey', apiKey);
    fetchOrganizations();
    configModal.style.display = 'none';
}

// Initialize the application
function init() {
    console.log("Loading Dashboard");
    // Initial display setup for default active tab content
    const defaultContent = document.getElementById('overviewTabSection');
    if (defaultContent) {
        defaultContent.style.display = 'block'; // Ensure the default tab content is visible
    }

    initializeEventListeners();
    setActiveTab('overviewTab');
    loadStoredConfig();

    // Initialize table filters
    const filterInputs = document.querySelectorAll('.scrollable-table thead input[type="text"]');
    filterInputs.forEach(input => filterTable(input, input.dataset.columnIndex));

    // Setup initial timespan dates and fetch initial data
    setupInitialTimespanDates();

    // Fetch initial data for API and Webhooks
    fetchInitialData();

}
// Fetch initial data for API and Webhooks
function fetchInitialData() {
    const initialApiTimespanSeconds = getTimespanInSeconds(document.getElementById('apiRequestsTimespanSelect').value);
    const initialWebhookTimespanSeconds = getTimespanInSeconds(document.getElementById('webhooksTimespanSelect').value);

    fetchApiDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), localStorage.getItem('MerakiOrganizationId'), initialApiTimespanSeconds);
    fetchWebhooksDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), localStorage.getItem('MerakiOrganizationId'), initialWebhookTimespanSeconds);
}

// Set initial timespan dates for API requests and webhook logs
function setupInitialTimespanDates() {
    const apiTimespanSeconds = getTimespanInSeconds(document.getElementById('apiRequestsTimespanSelect').value);
    const webhookTimespanSeconds = getTimespanInSeconds(document.getElementById('webhooksTimespanSelect').value);

    updateDateLabels(apiTimespanSeconds, 'apiRequestsStartDate', 'apiRequestsEndDate');
    updateDateLabels(webhookTimespanSeconds, 'webhooksStartDate', 'webhooksEndDate');
}

// Calculates the start and end dates for a given timespan in seconds
function calculateTimespanDates(timespanSeconds) {
    const endDate = new Date();
    let startDate = new Date(endDate.getTime() - timespanSeconds * 1000);

    return { startDate, endDate };
}

// Update the date labels according to the provided timespan
function updateDateLabels(timespanSeconds, startId, endId) {
    const { startDate, endDate } = calculateTimespanDates(timespanSeconds);
    const formatOptions = getFormatOptions(timespanSeconds);

    document.getElementById(startId).textContent = new Intl.DateTimeFormat('en-US', formatOptions).format(startDate);
    document.getElementById(endId).textContent = new Intl.DateTimeFormat('en-US', formatOptions).format(endDate);
}

// Determine the format options based on the timespan
function getFormatOptions(timespanSeconds) {
    // Timespans less than or equal to 2 hours show detailed time
    if (timespanSeconds <= 7200) {
        return { hour: '2-digit', minute: '2-digit', hour12: false }; // Use 24-hour format
    }
    // Use date only for longer timespans
    return { year: 'numeric', month: '2-digit', day: '2-digit' };
}

// Event Listeners
function initializeEventListeners() {
    configToggle.onclick = () => configModal.style.display = 'block';
    closeModal.onclick = () => configModal.style.display = 'none';
    window.onclick = (event) => {

        if (event.target === configModal) {
            configModal.style.display = 'none';
        }
        if (event.target === configModal) {
            configModal.style.display = 'none';
        }
    };

    document.getElementById('configForm').onsubmit = handleConfigFormSubmit;

    organizationSelect.onchange = async function () {
        const organizationId = this.value;
        if (!organizationId) {
            displayNotification("Organization ID is required!");
            return;
        }
        localStorage.setItem('MerakiOrganizationId', organizationId);
        await fetchOrganizationAdmins(organizationId);
        await fetchOrganizationNetworks(organizationId);
        updateVisualizationsForOrganization(organizationId);
    };

    // Event listener for global timespan selector
    document.getElementById('globalTimespanSelect').addEventListener('change', () => {
        const timespanSeconds = getTimespanInSeconds(globalTimespanSelect.value);
        fetchApiDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
        fetchWebhooksDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
    });

    document.getElementById('apiRequestsTimespanSelect').addEventListener('change', function () {
        const timespanSeconds = getTimespanInSeconds(this.value);
        updateDateLabels(timespanSeconds, 'apiRequestsStartDate', 'apiRequestsEndDate');
        fetchApiDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), localStorage.getItem('MerakiOrganizationId'), timespanSeconds);

    });

    document.getElementById('webhooksTimespanSelect').addEventListener('change', function () {
        const timespanSeconds = getTimespanInSeconds(this.value);
        updateDateLabels(timespanSeconds, 'webhooksStartDate', 'webhooksEndDate');
        fetchWebhooksDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
    });

    document.getElementById('urlSelect').addEventListener('change', updateChartsForSelectedUrl);

    // Page TABS
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            setActiveTab(this.id);
        });
    });

    document.getElementById('generateApiKeyBtnShortcut')?.addEventListener('click', () => {
        setActiveTab('apiManagementTab');
        setActiveTab('apiKeysTab');

    });


    document.getElementById('addWebhookReceiverBtnShortcut')?.addEventListener('click', () => {
        setActiveTab('webhookManagementTab');
        setActiveTab('webhookReceiversTab');

    });

    document.getElementById('webhookMetricsBtnShortcut')?.addEventListener('click', () => {
        setActiveTab('webhookManagementTab');
        setActiveTab('webhookMetricsTab');
    });

    document.getElementById('apiMetricsBtnShortcut')?.addEventListener('click', () => {
        setActiveTab('apiManagementTab');
        setActiveTab('apiMetricsTab');
    });


    initializeFilterEventListeners();
    initializeWebhookChartSelectors();
}


// Tabs
function setActiveTab(tabId) {
    console.log("setActiveTab: ", tabId);
    const isSubTab = document.getElementById(tabId).classList.contains('sub-tab');
    const topLevelTabs = document.querySelectorAll('.tabs > .tab');
    const subLevelTabs = document.querySelectorAll('.sub-tabs > .tab');
    const topLevelContents = document.querySelectorAll('.top-level-content');
    const subLevelContents = document.querySelectorAll('.sub-tab-content');

    if (isSubTab) {
        subLevelTabs.forEach(tab => tab.classList.remove('active'));
        subLevelContents.forEach(content => content.style.display = 'none');

        const activeSubContent = document.getElementById(`${tabId}Section`);
        document.getElementById(tabId).classList.add('active');
        if (activeSubContent) {
            activeSubContent.style.display = 'block';
            if (!activeSubContent.dataset.loaded) {
                loadContentForTab(tabId, activeSubContent);
                activeSubContent.dataset.loaded = "true"; // Mark as loaded
            }
        }
    } else {
        topLevelTabs.forEach(tab => tab.classList.remove('active'));
        topLevelContents.forEach(content => content.style.display = 'none');

        const activeTopContent = document.getElementById(`${tabId}Section`);
        document.getElementById(tabId).classList.add('active');
        if (activeTopContent) {
            activeTopContent.style.display = 'block';
            const firstSubTab = activeTopContent.querySelector('.sub-tab');
            if (firstSubTab) {
                setActiveTab(firstSubTab.id); // Always activate the first sub-tab
            }
            activeTopContent.dataset.initialized = "true"; // Mark as initialized
        }
    }
}

function loadContentForTab(tabId, contentElement) {
    if (tabId === 'apiKeysTab') {
        fetchAndDisplayApiKeyMgmtPage(contentElement);
    } else if (tabId === 'webhookReceiversTab') {
        fetchAndDisplayWebhookReceiversPage(contentElement);
    }
    else if (tabId === 'webhookTemplatesTab') {
        fetchAndDisplayWebhookTemplatesPage(contentElement);
    }
}

// Event listeners for top-level tabs and sub-tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        setActiveTab(this.id);
    });

    // Initialize the first tab as active on page load
    const firstTopTab = document.querySelector('.tabs > .tab');
    if (firstTopTab) {
        setActiveTab(firstTopTab.id);
    }
});


window.onload = () => {
    const firstTopTab = document.querySelector('.tabs > .tab');
    if (firstTopTab) {
        setActiveTab(firstTopTab.id);
    }
};

function fetchAndDisplayApiKeyMgmtPage(content) {
    fetch('apiKeyMgmt.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
            const api = new API(localStorage.getItem('MerakiApiKey'));
            fetchApiKeys(api);
            displayUserDetails(api);
            // Optionally, re-initialize any JavaScript that needs to run in the loaded content
        })
        .catch(error => console.error('Failed to load API Keys content:', error));
}

function fetchAndDisplayWebhookReceiversPage(content) {
    fetch('webhookReceivers.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
            const api = new API(localStorage.getItem('MerakiApiKey'));
            console.log('fetchAndDisplayWebhookReceiversPage')
            initWebhookReceivers(api);
        });

}

function fetchAndDisplayWebhookTemplatesPage(content) {
    fetch('webhookTemplates.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
            initWebhookTemplates();
        });

}

// New function to fetch and display user details
function displayUserDetails(api) {
    api.getAdministeredIdentitiesMe().then(userDetails => {
        document.getElementById('userName').textContent = userDetails.name;
        document.getElementById('userEmail').textContent = userDetails.email;
    }).catch(error => {
        console.error('Error fetching user details:', error);
    });
}
// Update Webhook History Chart based on selected URL and timespan
function updateChartsForSelectedUrl() {
    const selectedUrl = document.getElementById('urlSelect').value;
    const timespanSeconds = getTimespanInSeconds(document.getElementById('webhooksTimespanSelect').value);
    updateWebhookHistoryChart(webhookLogsData, timespanSeconds, selectedUrl);
    updateWebhookHistoryByAlertTypeChart(webhookLogs, timespanSeconds, selectedUrl);
    console.log("Updated charts for URL:", selectedUrl);  // Debugging statement
}

// Function to dynamically populate URL selector from logs
function populateUrlSelector(logs) {
    const urlSet = new Set(logs.map(log => log.url));
    const select = document.getElementById('urlSelect');
    select.innerHTML = '<option value="">All URLs</option>';
    urlSet.forEach(url => {
        const option = document.createElement('option');
        option.value = url;
        option.textContent = url;
        select.appendChild(option);
    });
}

function updateVisualizationsForOrganization(organizationId) {
    const timespanSeconds = getTimespanInSeconds(document.getElementById('apiRequestsTimespanSelect').value);
    updateDateLabels(timespanSeconds, 'apiRequestsStartDate', 'apiRequestsEndDate');
    fetchApiDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), organizationId, timespanSeconds);
    fetchWebhooksDataAndUpdateVis(localStorage.getItem('MerakiApiKey'), organizationId, timespanSeconds);
}

// Ensure that the initial state is set correctly when the page loads
function initializeWebhookChartSelectors() {
    const urlSelect = document.getElementById('urlSelect');
    if (urlSelect.options.length > 0) {
        urlSelect.value = urlSelect.options[0].value; // Set to first or any specific default value
    }
}


function filterTable(input, columnIndex) {
    let filter = input.value.toUpperCase();
    let table = input.closest("table");
    let tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[columnIndex];
        if (td) {
            let txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
    updateRecordCount(table.id);
}
window.filterTable = filterTable;



// ****************************
// Gather Data
// ****************************

// Fetches and displays the organizations in a select dropdown
async function fetchOrganizations() {
    console.log("Fetching Organizations");
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
        console.error("API Key must be set.");
        displayNotification('API Key is required.');
        return;
    }
    const api = new API(apiKey);
    try {
        showLoader();
        const data = await api.getOrganizations();
        console.log("organizations", data)
        organizationSelect.innerHTML = '<option value="">Select Organization</option>';
        data.forEach(org => {
            const option = document.createElement('option');
            option.value = org.id;
            option.textContent = `${org.name} (${org.id})`;
            organizationSelect.appendChild(option);
        });


        // Check if the stored organization ID is in the options list, otherwise select the 1st option
        const storedOrganizationId = localStorage.getItem('MerakiOrganizationId');
        const organizationIds = Array.from(organizationSelect.options).map(option => option.value);

        if (organizationIds.includes(storedOrganizationId)) {
            organizationSelect.value = storedOrganizationId;
        } else if (organizationSelect.options.length > 0) {
            organizationSelect.value = organizationSelect.options[0].value;
        }
        hideLoader();
    } catch (error) {
        console.error('Error fetching organizations:', error);
        displayNotification('Failed to fetch organizations. Check console for details.');
        hideLoader();
    }
}

// Fetches and stores admin data for the selected organization
async function fetchOrganizationAdmins(organizationId) {

    console.log("fetching admins for ", organizationId);
    const apiKey = localStorage.getItem('MerakiApiKey');
    if (!apiKey || !organizationId) {
        console.error("API Key and Organization ID must be set.");
        return;
    }
    const api = new API(apiKey);

    try {
        const admins = await api.getOrganizationAdmins(organizationId);
        // Save the admins data for later use in visualizations
        localStorage.setItem('MerakiAdmins', JSON.stringify(admins));
        console.log('Admins fetched and stored:', admins);
    } catch (error) {
        console.error('Error fetching organization admins:', error);
        displayNotification('Failed to fetch organization admins.');
    }
}

// Fetches and stores networks data for the selected organization
async function fetchOrganizationNetworks(organizationId) {

    console.log("fetching networks for ", organizationId);
    const apiKey = localStorage.getItem('MerakiApiKey');
    if (!apiKey || !organizationId) {
        console.error("API Key and Organization ID must be set.");
        return;
    }
    const api = new API(apiKey);

    try {
        const networks = await api.getOrganizationNetworks(organizationId);
        // Save the networks data for later use
        localStorage.setItem('networks', JSON.stringify(networks));
        console.log('Networks fetched and stored:', networks);
    } catch (error) {
        console.error('Error fetching organization networks:', error);
        displayNotification('Failed to fetch networks.');
    }
}

// Main function to load API Request and Response Code data
async function fetchApiDataAndUpdateVis(apiKey, organizationId, timespanSeconds) {
    console.log("fetchApiDataAndUpdateVis timespanSeconds", timespanSeconds);
    showLoader();
    const api = new API(apiKey);

    try {
        const [apiRequestsOverviewData, responseCodesData, apiRequestsData] = await Promise.all([
            api.getOrganizationApiRequestsOverview(organizationId, timespanSeconds),
            api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, timespanSeconds),
            api.getOrganizationApiRequests(organizationId, timespanSeconds, 1000).fetchAllPages(MAX_PAGE_LIMIT)
        ]);

        console.log("apiRequestsOverviewData", apiRequestsOverviewData);
        console.log("responseCodesData", responseCodesData);
        console.log("apiRequestsData", apiRequestsData);

        updateApiRequestHero(apiRequestsOverviewData);
        updateApiRequestsChart(responseCodesData, timespanSeconds);
        updateApiRequestsSuccessFailChart(responseCodesData, timespanSeconds);
        updateApiRequestTable(apiRequestsData);
        const apiRequestMetricsData = await apiRequestsMetrics(apiRequestsData, JSON.parse(localStorage.getItem('MerakiAdmins')));
        console.log("apiRequestMetricsData", apiRequestMetricsData);

        apiRequestsMetricsViz(apiRequestMetricsData);
        populateAllApiRequestsChartFilters(apiRequestMetricsData);
        setupTableSortListeners("#apiRequestTable");

        console.log("API Requests Data and Visualizations Updated");
    } catch (error) {
        console.error("Error fetching API requests data:", error);
        const errorDetails =  error.message.error || error | 'An unexpected error occurred.';
        displayNotification(`Error fetching API data: \n Error: ${error.status} \n ${errorDetails}`);
    } finally {
        hideLoader();
    }
}

async function fetchWebhooksDataAndUpdateVis(apiKey, organizationId, timespanSeconds) {
    showLoader();
    const api = new API(apiKey);
    try {
        webhookLogsData = await api.getOrganizationWebhooksLogs(organizationId, timespanSeconds, 1000).fetchAllPages(5);
        console.log("webhookLogsData", webhookLogsData);

        updateWebhookHero(webhookLogsData);
        updateWebhookHistoryChart(webhookLogsData, timespanSeconds);
        updateWebhookHistoryByIntervalSuccessFailChart(webhookLogsData, timespanSeconds);
        updateWebhookHistoryByAlertTypeChart(webhookLogsData, timespanSeconds);
        populateUrlSelector(webhookLogsData);
        webhookMetricsViz(webhookLogsData);
        updateWebhookLogsTable(webhookLogsData);
        const httpServerStats = calculateHttpServerStats(webhookLogsData);
        updateHttpServerStats(httpServerStats);
        setupTableSortListeners("#webhookLogsTable");

        console.log("Webhooks Data and Visualizations Updated");
    } catch (error) {
        console.error("Error fetching webhooks data:", error);
        const errorDetails =  error.message.error || 'An unexpected error occurred.';
        displayNotification(`Error fetching Webhook data: \n Error: ${error.status} \n ${errorDetails}`);
    } finally {
        hideLoader();
    }
}

// Utility Functions
function showLoader() {
    loader.style.display = 'block';
}

function hideLoader() {
    loader.style.display = 'none';
}

function getTimespanInSeconds(timespan) {
    const timespanInSeconds = {
        'twoHours': 7200,   // 2 hours
        'day': 86400, // 24 hours
        'week': 604800, // 7 days
        'month': 2592000 // 30 days
    };
    return timespanInSeconds[timespan] || timespanInSeconds['month']; // Default to 30 days if not specified
}

// Helper function to determine color class based on success rate
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




// // Hero - Number of API Requests & Webhooks Sent
function formatNumber(number) {
    return new Intl.NumberFormat('en-US').format(number);
}

function updateApiRequestHero(apiData) {
    const apiSuccessCount = apiData.responseCodeCounts['200'] || 0;
    const apiFailCount = Object.keys(apiData.responseCodeCounts)
        .filter(code => !code.startsWith('2'))
        .reduce((sum, code) => sum + (apiData.responseCodeCounts[code] || 0), 0);
    const apiSuccessRate = apiSuccessCount + apiFailCount > 0 ?
        ((apiSuccessCount / (apiSuccessCount + apiFailCount)) * 100).toFixed(2) : 'N/A';

    const apiMetricsInfo = document.getElementById('apiHeroInfo');
    apiMetricsInfo.innerHTML = `
        <div class="api-summary-label"><b>API Requests</b></div>
        <div class="api-summary-info">
            <span class="success">Success: ${formatNumber(apiSuccessCount)}</span>
            <span class="fail">Fail: ${formatNumber(apiFailCount)}</span>
            <span class="${getSuccessRateColorClass(apiSuccessRate)}">${apiSuccessRate}% success</span>
        </div>
    `;
}


function updateWebhookHero(webhookData) {
    console.log("updateWebhookHero webhookData", webhookData)
    const webhookHeroInfo = document.querySelector('#webhookHeroInfo');  // Ensure this matches your actual HTML

    if (!webhookHeroInfo) {
        console.error('Webhook Metrics Info element not found.');
        return; // Exit the function if the element does not exist
    }
    if (webhookData.length < 1) {
        webhookHeroInfo.textContent = `No Data`;
        return;
    }

    // Compute success and fail counts
    const webhookSuccessCount = webhookData.filter(log => log.responseCode >= 200 && log.responseCode < 300).length;
    const webhookFailCount = webhookData.length - webhookSuccessCount;
    const webhookTotalCount = webhookSuccessCount + webhookFailCount;
    const webhookSuccessRate = webhookTotalCount > 0 ? ((webhookSuccessCount / webhookTotalCount) * 100).toFixed(2) : null;
    const successRateClass = getSuccessRateColorClass(webhookSuccessRate);
    webhookHeroInfo.innerHTML = `
        <div class="api-summary-label"><b>Webhooks Sent</b></div>
        <div class="api-summary-info">
            <span class="success">Success: ${formatNumber(webhookSuccessCount)}</span>
            <span class="fail">Fail: ${formatNumber(webhookFailCount)}</span>
            <span class="success-rate ${successRateClass}">${webhookSuccessRate}% success</span>
        </div>
    `;

    // Update the UI elements safely
    webhookHeroInfo.querySelector('.success').textContent = webhookSuccessCount ? `Success: ${formatNumber(webhookSuccessCount)}` : 'Success: 0';
    webhookHeroInfo.querySelector('.fail').textContent = webhookFailCount ? `Fail: ${formatNumber(webhookFailCount)}` : 'Fail: 0';
    webhookHeroInfo.querySelector('.success-rate').textContent = webhookSuccessRate ? `${webhookSuccessRate}% success` : 'No Data';
    webhookHeroInfo.querySelector('.success-rate').style.display = webhookSuccessRate ? 'block' : 'none'; // Hide the element if no data

    // Additional checks for element existence to avoid errors
    function formatNumber(number) {
        return number.toLocaleString();  // Make sure this function exists or handle formatting inline
    }
}


// *******************
// API Request Metrics 
//
// *******************



// ** API Request Table **
function updateApiRequestTable(data) {
    const admins = JSON.parse(localStorage.getItem('MerakiAdmins')) || [];
    const adminMap = new Map(admins.map(admin => [admin.id, admin]));
    const tbody = document.querySelector('#apiRequestTable tbody');

    tbody.innerHTML = data.map(request => {
        const admin = adminMap.get(request.adminId) || {};
        return `
            <tr>
                <td>${request.ts}</td>
                <td>${admin.name || 'Unknown'} (${admin.email || 'No email'})</td>
                <td>${request.operationId}</td>
                <td>${request.sourceIp}</td>
                <td>${request.responseCode}</td>
                <td>${request.userAgent}</td>
                <td>${request.path}</td>
                <td>${request.queryString}</td>
            </tr>
        `;
    }).join('');
    updateRecordCount('apiRequestTable');
    //  setupTableSortListeners("#apiRequestTable");
}
// Table row count 
function updateRecordCount(tableId) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with ID '${tableId}' not found.`);
        return;
    }

    const totalRecordsId = tableId === 'apiRequestTable' ? 'totalApiRecords' : 'totalWebhookRecords';
    const totalRecordsSpan = document.getElementById(totalRecordsId);
    const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none').length;
    totalRecordsSpan.textContent = visibleRows;
}

// Populate a generic select element from an array of items
function populateApiRequestsChartSelect(selectId, items, placeholder = "All", nameProperty = "name", valueProperty = "name") {
    const select = document.getElementById(selectId);
    // Clear existing options except the placeholder
    for (let i = select.options.length - 1; i > 0; i--) {
        select.remove(i);
    }

    // Add new options from the items array
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueProperty]; // Use specified value property, which can be 'id' for admins
        option.textContent = item[nameProperty]; // Use specified name property for display
        select.appendChild(option);
    });
}

// Populate dynamic select elements 
function populateAllApiRequestsChartFilters(metricsData) {
    populateApiRequestsChartSelect('userAgentSelect', metricsData["User Agents"]);
    populateApiRequestsChartSelect('adminSelect', metricsData["Admins"], "name", "adminDetails");
    populateApiRequestsChartSelect('operationSelect', metricsData["Operation IDs"]);
    populateApiRequestsChartSelect('sourceIpSelect', metricsData["Source IPs"]);
}

// Initialize event listeners for filter dropdowns
function initializeFilterEventListeners() {
    document.getElementById('userAgentSelect').addEventListener('change', function () {
        updateDashboardWithFilters();
    });

    document.getElementById('adminSelect').addEventListener('change', function () {
        updateDashboardWithFilters();
    });

    document.getElementById('operationSelect').addEventListener('change', function () {
        updateDashboardWithFilters();
    });

    document.getElementById('sourceIpSelect').addEventListener('change', function () {
        updateDashboardWithFilters();
    });
}

async function updateDashboardWithFilters() {
    // Ensure that all elements exist
    const userAgentSelect = document.getElementById('userAgentSelect');
    const adminSelect = document.getElementById('adminSelect');
    const operationSelect = document.getElementById('operationSelect');
    const sourceIpSelect = document.getElementById('sourceIpSelect');
    const timespanSelect = document.getElementById('apiRequestsTimespanSelect');

    if (!userAgentSelect || !adminSelect || !operationSelect || !sourceIpSelect) {
        console.error('One or more filter elements are missing.');
        return;
    }

    const userAgent = userAgentSelect.value;
    const adminId = adminSelect.value;
    const operationId = operationSelect.value;
    const sourceIp = sourceIpSelect.value;
    const timespan = timespanSelect.value;
    const timespanSeconds = getTimespanInSeconds(timespan);
    const apiKey = localStorage.getItem('MerakiApiKey');
    const organizationId = localStorage.getItem('MerakiOrganizationId');

    if (!apiKey || !organizationId) {
        displayNotification("Configure API settings first.");
        return;
    }

    const api = new API(apiKey);
    try {
        console.log("updateDashboardWithFilters timespanSeconds", timespanSeconds)
        showLoader();
        const responseCodesData = await api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, timespanSeconds, {
            userAgent,
            adminId,
            operationId,
            sourceIp
        });
        updateApiRequestsChart(responseCodesData, timespan);
        updateApiRequestsSuccessFailChart(responseCodesData, timespanSeconds);
    } catch (error) {
        console.error('Error updating chart:', error);
        displayNotification('Failed to update the chart based on the selected filters.');
    } finally {
        hideLoader();
    }
}

// ****************
// Webhooks
// *****************

// HttpServers Card
function updateHttpServerStats(httpServerStats) {
    const statsContainer = document.querySelector('.http-servers-stats-container');
    statsContainer.innerHTML = ''; // Clear previous stats

    httpServerStats.forEach(data => {
        const statCard = document.createElement('div');
        statCard.className = 'http-server-stat-card';
        statCard.innerHTML = `
            <h3>${data.hostname}</h3>
            <div class="http-server-stat-line">
                <span class="success-label">Success:</span> 
                <span >${data.success} requests</span> 
                <span class="latency-value">~${data.avgSuccessDuration}ms</span>
            </div>
            <div class="http-server-stat-line">
                <span class="fail-label">Fail:</span> 
                <span >${data.fail} requests</span> 
                <span class="latency-value">~${data.avgFailDuration}ms</span>
            </div>
            <div class="success-rate ${getSuccessRateColorClass(calculatePercent(data.success, data.success + data.fail))}">${calculatePercent(data.success, data.success + data.fail)}% Success</div>
        `;
        statsContainer.appendChild(statCard);
    });
}

// ** Webhook Logs Table **
function updateWebhookLogsTable(data) {
    const tbody = document.querySelector('#webhookLogsTable tbody');  // Ensure you have an id for your webhook table

    tbody.innerHTML = data.map(log => `
        <tr>
            <td>${new Date(log.loggedAt).toLocaleString()}</td>
            <td>${log.networkId}</td>
            <td>${log.alertType}</td>     
            <td>${log.responseCode}</td>
            <td>${log.responseDuration}</td>
            <td>${log.url}</td>
        </tr>
    `).join('');
    updateRecordCount('webhookLogsTable');
}

const getHostnameFromUrl = (url) => new URL(url).hostname;
const calculatePercent = (partialValue, totalValue) => (totalValue ? ((partialValue / totalValue) * 100).toFixed(2) : 0);

// HTTP server stats 
function calculateHttpServerStats(webhookLogsData) {
    const stats = {};

    webhookLogsData.forEach(log => {
        const hostname = getHostnameFromUrl(log.url);
        if (!stats[hostname]) {
            stats[hostname] = {
                hostname,
                success: 0,
                fail: 0,
                totalSuccessDuration: 0,
                totalFailDuration: 0,
                countSuccess: 0,
                countFail: 0
            };
        }
        if (log.responseCode >= 200 && log.responseCode < 300) {
            stats[hostname].success += 1;
            stats[hostname].totalSuccessDuration += log.responseDuration;
            stats[hostname].countSuccess += 1;
        } else {
            stats[hostname].fail += 1;
            stats[hostname].totalFailDuration += log.responseDuration;
            stats[hostname].countFail += 1;
        }
    });

    // Calculate average response duration for successful and failed responses
    Object.keys(stats).forEach(hostname => {
        stats[hostname].avgSuccessDuration = stats[hostname].countSuccess > 0
            ? (stats[hostname].totalSuccessDuration / stats[hostname].countSuccess).toFixed(2)
            : 'N/A';
        stats[hostname].avgFailDuration = stats[hostname].countFail > 0
            ? (stats[hostname].totalFailDuration / stats[hostname].countFail).toFixed(2)
            : 'N/A';
    });

    // Convert stats into an array and sort by hostname
    return Object.values(stats).sort((a, b) => a.hostname.localeCompare(b.hostname));
}

function displayNotification(message) {
    const notificationBanner = document.getElementById('notificationBanner');
    notificationBanner.textContent = message;
    notificationBanner.style.display = 'block';
    setTimeout(() => {
        notificationBanner.style.display = 'none';
    }, 5000); // Hide the notification after 5 seconds
}

// Start the application
document.addEventListener('DOMContentLoaded', function () {
    init();
});



























