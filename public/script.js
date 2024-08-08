/**
 * Main JavaScript for Meraki Dashboard
 * 
 * This file contains the core functionality for the Meraki Dashboard application.
 * It handles API interactions, data visualization, and user interface management.
 * 
 * Key features:
 * - API key and organization management
 * - Fetching and displaying API requests and webhook logs
 * - Generating and updating charts and visualizations
 * - Managing tab navigation and content loading
 * - Handling user interactions and filters
 * 
 * Main components:
 * - init(): Initializes the application
 * - fetchApiDataAndUpdateVis(): Fetches API data and updates visualizations
 * - fetchWebhooksDataAndUpdateVis(): Fetches webhook data and updates visualizations
 * - updateApiRequestTable(): Updates the API requests table
 * - updateWebhookLogsTable(): Updates the webhook logs table
 * - Various chart update functions (e.g., updateApiRequestsChart, updateWebhookHistoryChart)
 * 
 * The script also includes utility functions for data formatting, error handling,
 * and DOM manipulation.
 * 
 * Note: This script relies on several imported modules for specific functionalities
 * such as API handling, chart generation, and data export.
 */


import API from './apiHandlers.js';
import apiRequestsMetricsViz from './apiRequestsMetricsViz.js';
import apiRequestsMetrics from './apiRequestsMetrics.js';
import webhookMetricsViz from './webhookMetricsViz.js';
import updateWebhookHistoryChart from './webhookHistoryChart.js';
import updateWebhookHistoryByIntervalSuccessFailChart from './webhookHistoryByIntervalSuccessFailChart.js';
import updateApiRequestsChart from './apiRequestsByIntervalChart.js';
import updateApiRequestsSuccessFailChart from './apiRequestsByIntervalSuccessFailChart.js';
import { updateWebhookHistoryByAlertTypeChart } from './webhookHistoryByAlertTypeChart.js';
//import { fetchApiKeys } from './apiKeyMgmt.js';
import { initializeApiKeyManagement } from './apiKeyMgmt.js';
import { setupTableSortListeners } from './tableSorter.js';
import { initWebhookReceivers } from './webhookReceivers.js';
import { init as initWebhookTemplates } from './webhookTemplates.js';
import { exportToExcel }from './exportToExcel.js';

// configs
const apiKeyInput = document.getElementById('apiKey');
const organizationSelect = document.getElementById('organizationSelect');
const configModal = document.getElementById('configModal');
const configToggle = document.getElementById('configToggle');
const closeModal = document.querySelector('.close');
const loader = document.getElementById('loader');
const apiKey = localStorage.getItem('MerakiApiKey');
const api = new API(apiKey);

// Global Variables
let webhookLogsData = [];
const API_EXPORT_DATA = {};
let apiRequestsData = []; 
const MAX_PAGES_LIMIT = 50;
const MAX_PAGE_LIMIT = 5; // Default max pages to paginate API

let isLoadingMore = false;
let currentTimespan = 'day'; // Default to 'day'

// Constants for timespan selector IDs
const TIMESPAN_SELECTORS = {
    OVERVIEW: 'overviewTimespanSelect',
    API_METRICS: 'apiMetricsTimespanSelect',
    API_ANALYSIS: 'apiAnalysisTimespanSelect',
    WEBHOOKS: 'webhooksTimespanSelect'
};


function createToolbar(metrics, sectionId) {
    const startTime = new Date(metrics.meta.startTime).toLocaleString();
    const endTime = new Date(metrics.meta.endTime).toLocaleString();
    const totalRecords = metrics.meta.numberOfRequests;
    const timespanSelectId = `${sectionId}TimespanSelect`;

    return `
      <div class="metrics-toolbar">
        <div class="toolbar-left">
          <div class="timespan-selector">
          from
            <select id="${timespanSelectId}">
              <option value="twoHours" ${currentTimespan === 'twoHours' ? 'selected' : ''}>Last 2 Hours</option>
              <option value="day" ${currentTimespan === 'day' ? 'selected' : ''}>Last Day</option>
              <option value="week" ${currentTimespan === 'week' ? 'selected' : ''}>Last Week</option>
              <option value="month" ${currentTimespan === 'month' ? 'selected' : ''}>Last Month</option>
            </select>
            <span class="data-summary-value">${startTime} <br>to<br> ${endTime}</span>
            
          </div>
          <button id="refreshButton" class="toolbar-button">Refresh</button>
           
        </div>
        <div class="toolbar-center">
          <div class="data-summary">
            <div class="data-summary-item">
              <span class="data-summary-label">Total Records:</span>
              <span class="data-summary-value" id="totalApiRecords">${totalRecords}</span>
            </div>
            <div class="data-summary-item">
              
              <div class="load-more">
              <button id="loadMoreRecordsBtn" class="toolbar-button">Load</button>
                <input type="number" id="recordsToLoad" min="1" max="20" value="1" step="1">
                <span>thousand more records</span>
                
              </div>
            </div>
          </div>
        </div>
        <div class="toolbar-right">

         <button id="exportCSVButton" class="toolbar-button">Export to Excel</button>
        </div>
      </div>
    `;
}

// Define update functions for each section
async function updateOverviewData(organizationId, timespanSeconds) {
    updateWebhooksData(organizationId, timespanSeconds);
    try {
        const [apiRequestsOverviewData, responseCodesData] = await Promise.all([
            api.getOrganizationApiRequestsOverview(organizationId, timespanSeconds),
            api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, {timespan: timespanSeconds}),
        ]);
        updateApiRequestHero(apiRequestsOverviewData.data);
        updateApiRequestsChart(responseCodesData.data, timespanSeconds);
        updateApiRequestsSuccessFailChart(responseCodesData.data, timespanSeconds);
    } catch (error) {
        console.error("Error updating overview data:", error);
        displayNotification(`Error updating overview data: ${error.message}`);
    }
}

async function updateApiMetricsData(organizationId, timespanSeconds) {
    try {
        const responseCodesData = await api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, {timespan: timespanSeconds});
        updateApiRequestsChart(responseCodesData.data, timespanSeconds);
     //   updateApiRequestsSuccessFailChart(responseCodesData.data, timespanSeconds);
    } catch (error) {
        console.error("Error updating API metrics data:", error);
        displayNotification(`Error updating API metrics data: ${error.message}`);
    }
}

async function updateApiAnalysisData(organizationId, timespanSeconds) {
    showLoader();
    try {
        const apiRequestsParams = {
            timespan: timespanSeconds,
            perPage: 1000,
            maxPages: MAX_PAGE_LIMIT
        };
        apiRequestsData = await api.getOrganizationApiRequests(organizationId, apiRequestsParams);
        updateApiRequestTable(apiRequestsData);
        const apiRequestMetricsData = await apiRequestsMetrics(apiRequestsData, JSON.parse(localStorage.getItem('MerakiAdmins') || '[]'));
        apiRequestsMetricsViz(apiRequestMetricsData);
        setupToolbarListeners(organizationId, 'apiAnalysis');
        populateAllApiRequestsChartFilters(apiRequestMetricsData);

        // Update the total records count
        const totalRecordsSpan = document.getElementById('totalApiRecords');
        if (totalRecordsSpan) {
            totalRecordsSpan.textContent = apiRequestsData.length;
        }

        API_EXPORT_DATA["apiRequestMetricsData"] = apiRequestMetricsData;
    } catch (error) {
        console.error("Error updating API analysis data:", error);
        displayNotification(`Error updating API analysis data: ${error.message}`);
    } finally {
        hideLoader();
    }
}

async function updateWebhooksData(organizationId, timespanSeconds) {
    try {
        webhookLogsData = await api.getOrganizationWebhooksLogs(organizationId, timespanSeconds, 1000, MAX_PAGE_LIMIT);
        updateWebhookHero(webhookLogsData);
        updateWebhookHistoryChart(webhookLogsData, timespanSeconds);
        updateWebhookHistoryByIntervalSuccessFailChart(webhookLogsData, timespanSeconds);
        updateWebhookHistoryByAlertTypeChart(webhookLogsData, timespanSeconds);
        webhookMetricsViz(webhookLogsData);
        updateWebhookLogsTable(webhookLogsData);
        const httpServerStats = calculateHttpServerStats(webhookLogsData);
        updateHttpServerStats(httpServerStats);
        populateWebhookUrlSelector(webhookLogsData);
    } catch (error) {
        console.error("Error updating webhooks data:", error);
        displayNotification(`Error updating webhooks data: ${error.message}`);
    }
}

// Define updateSectionData in the global scope
function updateSectionData(selectorId, timespanSeconds) {
    const organizationId = localStorage.getItem('MerakiOrganizationId');
    updateDateLabels(timespanSeconds, `${selectorId}StartDate`, `${selectorId}EndDate`);

    switch (selectorId) {
        case TIMESPAN_SELECTORS.OVERVIEW:
            updateOverviewData(organizationId, timespanSeconds);
            break;
        case TIMESPAN_SELECTORS.API_METRICS:
            updateApiMetricsData(organizationId, timespanSeconds);
            break;
        case TIMESPAN_SELECTORS.API_ANALYSIS:
            updateApiAnalysisData(organizationId, timespanSeconds);
            break;
        case TIMESPAN_SELECTORS.WEBHOOKS:
            updateWebhooksData(organizationId, timespanSeconds);
            break;
    }
}

// Load stored API key and Org ID
function loadStoredConfig() {
    if (localStorage.getItem('MerakiApiKey')) {
        apiKeyInput.value = localStorage.getItem('MerakiApiKey');



    }
    if (localStorage.getItem('MerakiOrganizationId')) {
        organizationSelect.value = localStorage.getItem('MerakiOrganizationId');
    }
}

// Config Form Submit Handler
function handleConfigFormSubmit(event) {
    event.preventDefault();
    const apiKey = apiKeyInput.value;
    if (apiKey === '') {
        localStorage.removeItem('MerakiApiKey');
        api.setApiKey(''); // Clear the API key in the API instance
        displayNotification("API Key cleared. You have been logged out.");
        return;
    }
    if (!apiKey) {
        displayNotification("API Key is required!");
        return;
    }
    localStorage.setItem('MerakiApiKey', apiKey);
    api.setApiKey(apiKey); // Update the API instance with the new key
    fetchOrganizations(); // Fetch organizations with the new API key
    configModal.style.display = 'none';
}

// Initialize the application
function init() {
    console.log("Loading Dashboard");
    initializeEventListeners();
    setActiveTab('overviewTab');
    loadStoredConfig();

    // Initialize table filters
    const filterInputs = document.querySelectorAll('.scrollable-table thead input[type="text"]');
    filterInputs.forEach(input => filterTable(input, input.dataset.columnIndex));

    // Setup initial timespan dates
    setupInitialTimespanDates();

    // Check if API key exists and load organizations
    const apiKey = localStorage.getItem('MerakiApiKey');
    if (apiKey && apiKey !== '') {
        fetchOrganizations();
    } else {
        // Open credentials config form if API key is not set or empty
        configModal.style.display = 'block';
    }
}

// Fetch initial data for API and Webhooks
async function fetchInitialData() {
    const organizationId = localStorage.getItem('MerakiOrganizationId');
    if (!organizationId) {
        console.error("No organization selected.");
        return;
    }

    await fetchOrganizationAdmins(organizationId);
    await fetchOrganizationNetworks(organizationId);

    // Fetch initial data for each section
    Object.values(TIMESPAN_SELECTORS).forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            const timespanSeconds = getTimespanInSeconds(selector.value);
            updateSectionData(selectorId, timespanSeconds);
        } else {
            console.warn(`Timespan selector with ID ${selectorId} not found.`);
        }
    });
}

// Set initial timespan dates for API requests and webhook logs
function setupInitialTimespanDates() {
    Object.values(TIMESPAN_SELECTORS).forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            const timespanSeconds = getTimespanInSeconds(selector.value);
            updateDateLabels(timespanSeconds, `${selectorId}StartDate`, `${selectorId}EndDate`);
        } else {
            console.warn(`Timespan selector with ID ${selectorId} not found.`);
        }
    });
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

    const startElement = document.getElementById(startId);
    const endElement = document.getElementById(endId);

    if (startElement) {
        startElement.textContent = new Intl.DateTimeFormat('en-US', formatOptions).format(startDate);
    } else {
        console.warn(`Start date element with ID ${startId} not found.`);
    }

    if (endElement) {
        endElement.textContent = new Intl.DateTimeFormat('en-US', formatOptions).format(endDate);
    } else {
        console.warn(`End date element with ID ${endId} not found.`);
    }
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
    };

    document.getElementById('configForm').onsubmit = handleConfigFormSubmit;

    // Modify the organization select change handler
    organizationSelect.onchange = async function () {
        const organizationId = this.value;
        if (!organizationId) {
            displayNotification("Organization ID is required!");
            return;
        }
        localStorage.setItem('MerakiOrganizationId', organizationId);
        await fetchOrganizationAdmins(organizationId);
        await fetchOrganizationNetworks(organizationId);

        // Ensure the DOM is fully loaded before updating visualizations
        if (document.readyState === 'complete') {
            updateVisualizationsForOrganization(organizationId);
        } else {
            window.addEventListener('load', () => updateVisualizationsForOrganization(organizationId));
        }
    };

    // Add event listeners for each timespan selector
    Object.values(TIMESPAN_SELECTORS).forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.addEventListener('change', function () {
                const timespanSeconds = getTimespanInSeconds(this.value);
                updateSectionData(selectorId, timespanSeconds);
            });
        } else {
            console.warn(`Timespan selector with ID ${selectorId} not found.`);
        }
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
    // console.log("setActiveTab: ", tabId);
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
           // fetchApiKeys(api);
           initializeApiKeyManagement(api);
            displayUserDetails(api);
        })
        .catch(error => console.error('Failed to load API Keys content:', error));
}

function fetchAndDisplayWebhookReceiversPage(content) {
    fetch('webhookReceivers.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
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
function populateWebhookUrlSelector(logs) {
    console.log("populateUrlSelector logs", logs);
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

    const timespanSelect = document.getElementById('apiRequestsTimespanSelect');
    let timespanSeconds;

    if (timespanSelect) {
        timespanSeconds = getTimespanInSeconds(timespanSelect.value);
        updateDateLabels(timespanSeconds, 'apiRequestsStartDate', 'apiRequestsEndDate');
    } else {
        console.warn('apiRequestsTimespanSelect not found, using default timespan');
        timespanSeconds = getTimespanInSeconds('day'); // Use a default value
    }

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



// Gather Data


// Fetches and displays the organizations in a select dropdown
async function fetchOrganizations() {
    console.log("Fetching Organizations");
    const apiKey = localStorage.getItem('MerakiApiKey');
    if (!apiKey) {
        console.error("API Key must be set.");
        displayNotification('API Key is required.');
        configModal.style.display = 'block';
        return;
    }

    try {
        showLoader();
        const { data } = await api.getOrganizations();
        console.log("organizations", data);
        organizationSelect.innerHTML = '<option value="">Select Organization</option>';
        data.sort((a, b) => a.name.localeCompare(b.name)); // Sort organizations alphabetically
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
        } else if (organizationSelect.options.length > 1) {
            organizationSelect.value = organizationSelect.options[1].value; // Select first org (index 1 because index 0 is the placeholder)
            localStorage.setItem('MerakiOrganizationId', organizationSelect.value);
        }

        hideLoader();
        
        // Only fetch initial data if an organization is selected
        if (organizationSelect.value) {
            fetchInitialData();
        }
    } catch (error) {
        console.error('Error fetching organizations:', error);
        displayNotification('Failed to fetch organizations. Check console for details.');
        hideLoader();
        configModal.style.display = 'block';
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

    try {
        const { data: admins } = await api.getOrganizationAdmins(organizationId);
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

    try {
        const networks = await api.getOrganizationNetworks(organizationId).then(res => {
            console.log('Networks fetched and stored:', res.data);
            return res.data;
        });
        // Save the networks data for later use
        localStorage.setItem('networks', JSON.stringify(networks));
        console.log('Networks fetched and stored:', networks);
    } catch (error) {
        console.error('Error fetching organization networks:', error);
        displayNotification('Failed to fetch networks.');
    }
}

async function loadMoreApiRequests() {
    if (isLoadingMore) return; // Prevent multiple executions
    isLoadingMore = true;

    const loadMoreButton = document.getElementById('loadMoreRecordsBtn');
    const recordsToLoadInput = document.getElementById('recordsToLoad');

    if (!loadMoreButton || !recordsToLoadInput) {
        console.error('Required elements not found');
        isLoadingMore = false;
        return;
    }

    loadMoreButton.disabled = true;
    //loadMoreButton.textContent = 'Loading...';
    loadMoreButton.querySelector('i').className = 'fa fa-spinner fa-spin';

    showLoader();

    const organizationId = localStorage.getItem('MerakiOrganizationId');
    const timespanSeconds = getTimespanInSeconds(currentTimespan);
    const recordsToLoad = parseInt(recordsToLoadInput.value, 10) || 1;
    const pagesToLoad = Math.min(recordsToLoad, MAX_PAGES_LIMIT);

    try {
        const params = {
            timespan: timespanSeconds,
            perPage: 1000,
            maxPages: pagesToLoad,
            endingBefore: apiRequestsData.length > 0 ? new Date(apiRequestsData[apiRequestsData.length - 1].ts).getTime() / 1000 : undefined
        };

        const newRecords = await api.getOrganizationApiRequests(organizationId, params);

        apiRequestsData = [...apiRequestsData, ...newRecords].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
        updateApiRequestTable(apiRequestsData);
        const apiRequestMetricsData = await apiRequestsMetrics(apiRequestsData, JSON.parse(localStorage.getItem('MerakiAdmins')));
        apiRequestsMetricsViz(apiRequestMetricsData);
        populateAllApiRequestsChartFilters(apiRequestMetricsData);

        loadMoreButton.disabled = newRecords.length < pagesToLoad * 1000;
        loadMoreButton.querySelector('i').className = 'fa fa-plus';

        // Update total records count
        const totalRecordsSpan = document.getElementById('totalApiRecords');
        if (totalRecordsSpan) {
            totalRecordsSpan.textContent = apiRequestsData.length;
        }
    } catch (error) {
        console.error("Error loading more API requests:", error);
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = 'Load more records';
    } finally {
        hideLoader();
        isLoadingMore = false;
    }
}


function setupToolbarListeners(organizationId, sectionId) {
    const toolbarContainer = document.querySelector('.toolbar');
    if (!toolbarContainer) {
        console.error('Toolbar not found');
        return;
    }

    const timespanSelect = document.getElementById(`${sectionId}TimespanSelect`);
    timespanSelect.addEventListener('change', async (event) => {
        currentTimespan = event.target.value; // Update the current timespan
        const timespanSeconds = getTimespanInSeconds(currentTimespan);
        await updateSectionData(sectionId, timespanSeconds);
    });

    toolbarContainer.addEventListener('click', async (event) => {
        const timespanSeconds = getTimespanInSeconds(timespanSelect.value);
        const clickedElement = event.target.closest('button');

        if (!clickedElement) return;

        if (clickedElement.id === 'refreshButton') {
            await updateSectionData(sectionId, timespanSeconds);
        } else if (clickedElement.id === 'loadMoreRecordsBtn') {
            await loadMoreApiRequests();
        } else if (clickedElement.id === 'exportCSVButton') {
            exportToCSV(sectionId === 'apiMetrics');
        }
    });

    const recordsToLoadInput = document.getElementById('recordsToLoad');
    if (recordsToLoadInput) {
        recordsToLoadInput.addEventListener('change', (event) => {
            const newCount = parseInt(event.target.value, 10);
            console.log(`Records to load changed to ${newCount}`);
        });
    }
}

function exportToCSV(isApiMetrics) {
    try {
        const organizationName = organizationSelect.options[organizationSelect.selectedIndex].textContent.split('(')[0].trim();
        const timespanSelect = document.getElementById(isApiMetrics ? 'apiMetricsTimespanSelect' : 'apiAnalysisTimespanSelect');
       // const dataKey = isApiMetrics ? "apiRequestMetricsData" : "apiAnalysisData";
        const title = isApiMetrics ? "API-metrics" : "API-analysis";

        const timeHuman = getCurrentDateAndTimespan(timespanSelect.value);
        const fullTitle = `${title}-${organizationName}-${timeHuman}`;

        exportToExcel(fullTitle, API_EXPORT_DATA["apiRequestMetricsData"]);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        displayNotification('Failed to export data to CSV.');
    }
}


async function fetchApiDataAndUpdateVis(apiKey, organizationId, timespanSeconds) {
    showLoader();

    try {
        const apiRequestsParams = {
            timespan: timespanSeconds,
            perPage: 1000,
            maxPages: MAX_PAGE_LIMIT
        };
        console.log("Fetching API requests with params:", apiRequestsParams);
        apiRequestsData = await api.getOrganizationApiRequests(organizationId, apiRequestsParams);
        console.log("Received API requests data:", apiRequestsData.length, "items");

        const [apiRequestsOverviewData, responseCodesData] = await Promise.all([
            api.getOrganizationApiRequestsOverview(organizationId, timespanSeconds),
            api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, {timespan: timespanSeconds}),
        ]);

        console.log("apiRequestsOverviewData", apiRequestsOverviewData);
        console.log("responseCodesData", responseCodesData);
        console.log("apiRequestsData", apiRequestsData);

        updateApiRequestHero(apiRequestsOverviewData.data);
        updateApiRequestsChart(responseCodesData.data, timespanSeconds);
        updateApiRequestsSuccessFailChart(responseCodesData.data, timespanSeconds);
        updateApiRequestTable(apiRequestsData);
        const apiRequestMetricsData = await apiRequestsMetrics(apiRequestsData, JSON.parse(localStorage.getItem('MerakiAdmins') || '[]'));
        console.log("apiRequestMetricsData", apiRequestMetricsData);

        // Create and insert toolbar
        const toolbarContainer = document.getElementById('apiToolbar');
        if (toolbarContainer) {
            toolbarContainer.innerHTML = createToolbar(apiRequestMetricsData, 'apiMetrics');
            setupToolbarListeners(organizationId, 'apiMetrics');
        } else {
            console.error('API Toolbar container not found');
        }

        // Display metrics
        apiRequestsMetricsViz(apiRequestMetricsData);
        console.log("API Requests Data and Visualizations Updated");
        API_EXPORT_DATA["apiRequestMetricsData"] = apiRequestMetricsData;
        console.log("API_EXPORT_DATA", API_EXPORT_DATA)
        return apiRequestMetricsData;
    } catch (error) {
        console.error("Error fetching API requests data:", error);
        displayNotification(`Error fetching API data: ${error.message}`);
    } finally {
        hideLoader();
    }
}

async function fetchWebhooksDataAndUpdateVis(apiKey, organizationId, timespanSeconds) {
    console.log("fetchWebhooksDataAndUpdateVis timespanSeconds", timespanSeconds);
    showLoader();
    try {
        console.log("Fetching webhook logs with timespan:", timespanSeconds);
        webhookLogsData = await api.getOrganizationWebhooksLogs(organizationId, timespanSeconds, 1000, MAX_PAGE_LIMIT);
        console.log("webhookLogsData", webhookLogsData);

        updateWebhookHero(webhookLogsData);
        updateWebhookHistoryChart(webhookLogsData, timespanSeconds);
        updateWebhookHistoryByIntervalSuccessFailChart(webhookLogsData, timespanSeconds);
        updateWebhookHistoryByAlertTypeChart(webhookLogsData, timespanSeconds);
        populateWebhookUrlSelector(webhookLogsData);
        webhookMetricsViz(webhookLogsData);
        updateWebhookLogsTable(webhookLogsData);
        const httpServerStats = calculateHttpServerStats(webhookLogsData);
        updateHttpServerStats(httpServerStats);
        setupTableSortListeners("#webhookLogsTable");

        console.log("Webhooks Data and Visualizations Updated");
    } catch (error) {
        console.error("Error fetching webhooks data:", error);
        displayNotification(`Error fetching Webhook data: ${error.message}`);
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
    if (!apiData || typeof apiData !== 'object') {
        console.error('Invalid apiData passed to updateApiRequestHero:', apiData);
        return;
    }

    const responseCodeCounts = apiData.responseCodeCounts || {};
    const apiSuccessCount = responseCodeCounts['200'] || 0;
    const apiFailCount = Object.keys(responseCodeCounts)
        .filter(code => !code.startsWith('2'))
        .reduce((sum, code) => sum + (responseCodeCounts[code] || 0), 0);
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
    if (!Array.isArray(data)) {
        console.error('Invalid data passed to updateApiRequestTable:', data);
        return;
    }

    let admins = [];
    try {
        admins = JSON.parse(localStorage.getItem('MerakiAdmins')) || [];
    } catch (error) {
        console.error('Error parsing admin data:', error);
    }

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
    console.log("populateApiRequestsChartSelect selectId items", selectId, items);
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
    populateApiRequestsChartSelect('operationSelect', metricsData["Operations"]);
    populateApiRequestsChartSelect('sourceIpSelect', metricsData["Source IPs"]);
}

// Initialize event listeners for filter dropdowns
function initializeFilterEventListeners() {
    const filters = ['userAgentSelect', 'adminSelect', 'operationSelect', 'sourceIpSelect', 'apiRequestsTimespanSelect'];
    
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', updateDashboardWithFilters);
        } else {
            console.warn(`Element with id '${filterId}' not found.`);
        }
    });
}

// Add this new function to update the timespan labels
function updateTimespanLabels(timespanValue) {
    const now = new Date();
    const timespanSeconds = getTimespanInSeconds(timespanValue);
    const startDate = new Date(now.getTime() - timespanSeconds * 1000);

    document.getElementById('apiRequestsTimespanSelectStartDate').textContent = startDate.toLocaleString();
    document.getElementById('apiRequestsTimespanSelectEndDate').textContent = now.toLocaleString();
}

// Modify the updateDashboardWithFilters function
async function updateDashboardWithFilters() {
    const filters = ['userAgentSelect', 'adminSelect', 'operationSelect', 'sourceIpSelect', 'apiRequestsTimespanSelect'];
    const filterValues = {};

    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            filterValues[filterId] = element.value;
        }
    });

    const timespanValue = filterValues.apiRequestsTimespanSelect;
    const timespanSeconds = getTimespanInSeconds(timespanValue);
    const apiKey = localStorage.getItem('MerakiApiKey');
    const organizationId = localStorage.getItem('MerakiOrganizationId');

    if (!apiKey || !organizationId) {
        displayNotification("Configure API settings first.");
        return;
    }

    // Update the timespan labels
    updateTimespanLabels(timespanValue);

    try {
        showLoader();
        const params = {
            timespan: timespanSeconds,
            // interval:120,
            userAgent: filterValues.userAgentSelect !== "All" ? filterValues.userAgentSelect : undefined,
            adminIds: filterValues.adminSelect !== "All" ? [filterValues.adminSelect] : undefined,
            operationIds: filterValues.operationSelect !== "All" ? [filterValues.operationSelect] : undefined,
            sourceIps: filterValues.sourceIpSelect !== "All" ? [filterValues.sourceIpSelect] : undefined
        };

        // Remove undefined values
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

        console.log("Sending request with params:", params);
        const responseCodesData = await api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, params);

        console.log("Received response:", responseCodesData);

        if (responseCodesData && responseCodesData.data) {
            updateApiRequestsChart(responseCodesData.data, timespanSeconds);
            updateApiRequestsSuccessFailChart(responseCodesData.data, timespanSeconds);
        } else {
            console.error('Unexpected response format:', responseCodesData);
            displayNotification('Received unexpected data format from the server.');
        }
    } catch (error) {
        console.error('Error updating chart:', error);
        displayNotification('Failed to update the chart based on the selected filters.');
    } finally {
        hideLoader();
    }
}

// Make sure to call updateDashboardWithFilters when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // ... other initialization code ...
    updateDashboardWithFilters();
});

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

function getCurrentDateAndTimespan(timespan) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in ISO format
    const timespanLabels = {
        'twoHours': '2 Hours',
        'day': '1 Day',
        'week': '1 Week',
        'month': '1 Month'
    };
    const selectedTimespan = timespanLabels[timespan] || '1 Month'; // Default to 1 Month if not specified
    return `${currentDate}_${selectedTimespan}`;
}

// Start the application
document.addEventListener('DOMContentLoaded', function () {
    init();
});



























