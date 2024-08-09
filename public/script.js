/**
 * Meraki Dashboard Main Script
 * 
 * This script provides the core functionality for the Meraki Dashboard application, 
 * including API interactions, data visualization, and user interface management.
 * 
 * Key Features:
 * - API Key and Organization Management
 * - Fetching and Displaying API Requests and Webhook Logs
 * - Generating and Updating Charts and Visualizations
 * - Managing Tab Navigation and Content Loading
 * - Handling User Interactions and Filters
 * 
 * Main Components:
 * - init(): Initializes the application
 * - fetchInitialData(): Fetches initial data for API and Webhooks
 * - updateSectionData(): Updates data for a specific section based on timespan
 * - updateOverviewData(): Updates overview data and visualizations
 * - updateApiMetricsData(): Updates API metrics data and visualizations
 * - updateApiAnalysisData(): Updates API analysis data and visualizations
 * - updateWebhooksData(): Updates webhook data and visualizations
 * - createToolbar(): Creates a toolbar for metrics sections
 * - setActiveTab(): Manages tab navigation and content display
 * - loadContentForTab(): Loads content for specific tabs
 * - fetchOrganizations(): Fetches and displays organizations in a dropdown
 * - fetchOrganizationAdmins(): Fetches and stores admin data for the selected organization
 * - fetchOrganizationNetworks(): Fetches and stores network data for the selected organization
 * - loadMoreApiRequests(): Loads more API request data
 * - setupToolbarListeners(): Sets up event listeners for toolbar actions
 * - exportToCSV(): Exports data to CSV format
 * - updateApiRequestsIntervalChartWithFilters(): Updates API request interval chart based on selected filters
 * 
 * Utility Functions:
 * - showLoader(): Displays a loading spinner
 * - hideLoader(): Hides the loading spinner
 * - getTimespanInSeconds(): Converts a timespan string to seconds
 * - displayNotification(): Displays a notification message
 * - getCurrentDateAndTimespan(): Gets the current date and timespan
 * - updateDateLabels(): Updates date labels based on timespan
 * - filterTable(): Filters table rows based on input
 * - populateWebhookUrlSelector(): Populates the URL selector from logs
 * - updateChartsForSelectedUrl(): Updates charts based on selected URL and timespan
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
import { updateApiRequestTable, updateRecordCount } from './apiRequestHistoryTable.js';
import { updateWebhookLogsTable } from './webhookHistoryTable.js';
import { updateApiRequestHero } from './apiRequestHero.js';
import { updateWebhookHero } from './webhookHero.js';
import { updateHttpServerStats, calculateHttpServerStats } from './webhookReceiversStatsCard.js';
import {
    showLoader,
    hideLoader,
    getTimespanInSeconds,
    displayNotification,
    getCurrentDateAndTimespan,
    updateDateLabels
} from './helpers.js';

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

// function createResponseCodeToolbar(metrics) {
//     console.log("createResponseCodeToolbar metrics", metrics);
//     const startTime = new Date(metrics.meta.startTime).toLocaleString();
//     const endTime = new Date(metrics.meta.endTime).toLocaleString();
//     const totalRecords = metrics.meta.numberOfRequests;
  
//     return `
//       <div class="metrics-toolbar">
//         <div class="toolbar-left">
//           <div class="timespan-selector">
//             from
//             <select id="responseCodeTimespanSelect">
//               <option value="twoHours" ${currentTimespan === 'twoHours' ? 'selected' : ''}>Last 2 Hours</option>
//               <option value="day" ${currentTimespan === 'day' ? 'selected' : ''}>Last Day</option>
//               <option value="week" ${currentTimespan === 'week' ? 'selected' : ''}>Last Week</option>
//               <option value="month" ${currentTimespan === 'month' ? 'selected' : ''}>Last Month</option>
//             </select>
//             <span id="responseCodeTimespanSelectStartDate">${startTime}</span> to
//             <span id="responseCodeTimespanSelectEndDate">${endTime}</span>
//           </div>
//           <button id="refreshResponseCodeButton" class="toolbar-button">Refresh</button>
//         </div>
//         <div class="toolbar-right">
//           <button id="exportResponseCodeCSVButton" class="toolbar-button">Export to Excel</button>
//         </div>
//       </div>
//     `;
//   }

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

async function updateApiHistoryData(organizationId, timespanSeconds) {
    try {
      showLoader();
      await updateApiAnalysisData(organizationId, timespanSeconds);
    } catch (error) {
      console.error("Error updating API history data:", error);
      displayNotification(`Error updating API history data: ${error.message}`);
    } finally {
      hideLoader();
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
        setupToolbarListeners('apiAnalysis');

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


function setupApiHistoryToolbarListeners() {
    const timespanSelect = document.getElementById('apiHistoryTimespanSelect');
    if (timespanSelect) {
      timespanSelect.addEventListener('change', async (event) => {
        currentTimespan = event.target.value; // Update the current timespan
        const timespanSeconds = getTimespanInSeconds(currentTimespan);
        updateTimespanLabels(currentTimespan, 'apiHistoryTimespanSelectStartDate', 'apiHistoryTimespanSelectEndDate');
        await updateApiHistoryData(localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
      });
    }
  
    const refreshButton = document.getElementById('refreshApiHistoryButton');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        const timespanSeconds = getTimespanInSeconds(currentTimespan);
        await updateApiHistoryData(localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
      });
    }
  
    const loadMoreButton = document.getElementById('loadMoreApiHistoryRecordsBtn');
    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', async () => {
        await loadMoreApiHistoryRecords();
      });
    }
  
    const exportButton = document.getElementById('exportApiHistoryCSVButton');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        exportToCSV(true); // Assuming true indicates it's API history
      });
    }
  }
  
  function updateTimespanLabels(timespanValue, startDateId, endDateId) {
    const now = new Date();
    const timespanSeconds = getTimespanInSeconds(timespanValue);
    const startDate = new Date(now.getTime() - timespanSeconds * 1000);
  
    const startDateElement = document.getElementById(startDateId);
    const endDateElement = document.getElementById(endDateId);
  
    if (startDateElement) {
      startDateElement.textContent = startDate.toLocaleString();
    }
  
    if (endDateElement) {
      endDateElement.textContent = now.toLocaleString();
    }
  }
async function updateResponseCodeData(organizationId, timespanSeconds) {
    try {
        const responseCodesData = await api.getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, { timespan: timespanSeconds });
        updateApiRequestsChart(responseCodesData.data, timespanSeconds);

        // // Create and insert toolbar
        // const toolbarContainer = document.getElementById('responseCodeToolbar');
        // if (toolbarContainer) {
        //     toolbarContainer.innerHTML = createResponseCodeToolbar(responseCodesData);
        //     setupResponseCodeToolbarListeners();
        // } else {
        //     console.error('Response Code Toolbar container not found');
        // }

        // Set the start and end dates
        const startDateElement = document.getElementById('apiResponseCodeTimespanSelectStartDate');
        const endDateElement = document.getElementById('apiResponseCodeTimespanSelectEndDate');
        if (startDateElement && endDateElement) {
            const startTime = responseCodesData.meta?.startTime || responseCodesData[0]?.ts;
            const endTime = responseCodesData.meta?.endTime || responseCodesData[responseCodesData.length - 1]?.ts;
            if (startTime && endTime) {
                startDateElement.textContent = new Date(startTime).toLocaleString();
                endDateElement.textContent = new Date(endTime).toLocaleString();
            } else {
                console.error('Start time or end time not found in response data');
            }
        }
    } catch (error) {
        console.error("Error updating response code data:", error);
        displayNotification(`Error updating response code data: ${error.message}`);
    }
}


function setupResponseCodeToolbarListeners() {
    const timespanSelect = document.getElementById('responseCodeTimespanSelect');
    timespanSelect.addEventListener('change', async (event) => {
      currentTimespan = event.target.value; // Update the current timespan
      const timespanSeconds = getTimespanInSeconds(currentTimespan);
      updateTimespanLabels(currentTimespan, 'responseCodeTimespanSelectStartDate', 'responseCodeTimespanSelectEndDate');
      await updateResponseCodeData(localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
    });
  
    document.getElementById('refreshResponseCodeButton').addEventListener('click', async () => {
      const timespanSeconds = getTimespanInSeconds(currentTimespan);
      await updateResponseCodeData(localStorage.getItem('MerakiOrganizationId'), timespanSeconds);
    });
  
    document.getElementById('exportResponseCodeCSVButton').addEventListener('click', () => {
      exportToCSV(false); // Assuming false indicates it's not API metrics
    });
  }
  

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

    // Fetch initial data for response code section
    const timespanSeconds = getTimespanInSeconds(document.getElementById('apiResponseCodeTimespanSelect').value);
    await updateResponseCodeData(organizationId, timespanSeconds);
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

  

    // initializeFilterEventListeners();
    initializeWebhookChartSelectors();
    setupResponseCodeToolbarListeners();
    setupApiHistoryToolbarListeners();
    updateTimespanLabels(currentTimespan, 'responseCodeTimespanSelectStartDate', 'responseCodeTimespanSelectEndDate');
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

// UI Pages

function fetchAndDisplayApiKeyMgmtPage(content) {
    fetch('apiKeyMgmt.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
           // fetchApiKeys(api);
           initializeApiKeyManagement(api)
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

    const timespanSelect = document.getElementById('apiapiResponseCodeTimespanSelect');
    let timespanSeconds;

    if (timespanSelect) {
        timespanSeconds = getTimespanInSeconds(timespanSelect.value);
        updateDateLabels(timespanSeconds, 'apiRequestsStartDate', 'apiRequestsEndDate');
    } else {
        console.warn('apiapiResponseCodeTimespanSelect not found, using default timespan');
        timespanSeconds = getTimespanInSeconds('day'); // Use a default value
    }

    fetchApiDataAndUpdateVis(organizationId, timespanSeconds);
    fetchWebhooksDataAndUpdateVis(organizationId, timespanSeconds);
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


function setupToolbarListeners(sectionId) {
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


async function fetchApiDataAndUpdateVis(organizationId, timespanSeconds) {
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
            setupToolbarListeners('apiMetrics');
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

async function fetchWebhooksDataAndUpdateVis(organizationId, timespanSeconds) {
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

// Update the API Request Interval Chart with selected filters
async function updateApiRequestsIntervalChartWithFilters() {
    const filters = ['userAgentSelect', 'adminSelect', 'operationSelect', 'sourceIpSelect', 'apiapiResponseCodeTimespanSelect'];
    const filterValues = {};

    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            filterValues[filterId] = element.value;
        }
    });

    const timespanValue = filterValues.apiapiResponseCodeTimespanSelect;
    const timespanSeconds = getTimespanInSeconds(timespanValue);
    const apiKey = localStorage.getItem('MerakiApiKey');
    const organizationId = localStorage.getItem('MerakiOrganizationId');

    if (!apiKey || !organizationId) {
        displayNotification("Configure API settings first.");
        return;
    }

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
           // updateApiRequestsSuccessFailChart(responseCodesData.data, timespanSeconds);
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

export { updateApiRequestsIntervalChartWithFilters as updateDashboardWithFilters }; // used by the API Requests Interval Chart

// Start the application
document.addEventListener('DOMContentLoaded', function () {
    init();
});



























