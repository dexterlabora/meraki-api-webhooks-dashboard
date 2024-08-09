# Meraki API & Webhook Dashboard

## Overview

The Meraki API & Webhook Dashboard is a web UI designed to monitor, analyze, and manage interactions with the Cisco Meraki Dashboard API and webhook system. It provides a user-friendly interface for visualizing API usage, tracking webhook events, and managing API keys and webhook receivers.

## Key Features

1. **Overview**
   - Provides a high-level summary of API and webhook activities.
   - Displays key metrics such as total API requests, success rates, and error rates.
   - Includes time filters (e.g., last 2 hours, day, week, month) for temporal control over the data displayed.

2. **API Management**
   - **Metrics**: Visualizes API request data, including requests grouped by response code and detailed API request logs.
     - Allows filtering by user agent, admin, operation, and source IP.
     - Time filters provide temporal control over the data displayed.
   - **History**: Displays a detailed table of API request logs with sortable columns.
   - **API Keys and Access**: Manages API keys securely, allowing users to generate, view, and revoke API keys. Tracks API key usage and permissions.

3. **Webhook Management**
   - **Metrics**: Logs and visualizes webhook activities by receiver URL and alert type.
     - Displays success and failure rates alongside response times.
     - Filters for webhook logs include network ID, URL, and alert type.
   - **History**: Displays a detailed table of webhook events with sortable columns.
   - **Receivers**: Manages webhook receivers, allowing users to add, edit, and delete receivers.
   - **Templates**: Handles webhook payload templates, enabling users to create, edit, and manage templates for webhook payloads.

4. **Toolbar**
   - **Timespans**: Allows users to select different time ranges (e.g., last 2 hours, day, week, month) to filter the data displayed across the dashboard.
   - **Refresh**: Provides a manual refresh button to update the data displayed in real-time. 
   - **Export**: Enables users to export data in various formats (e.g., CSV, Excel) for offline analysis and reporting.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript (utilizing Chart.js for visualizations and Axios for HTTP requests).
- **Backend**: Node.js server using Express.js framework to handle routing and API request proxying.
- **API Integration**: Cisco Meraki Dashboard API.

## API Operations and Visualizations

### API Operations

1. **getOrganizations**
   - **Purpose**: List accessible organizations.
   - **Usage**: Populates the organization dropdown for user selection.

2. **getOrganizationAdmins**
   - **Purpose**: Retrieve organization admins.
   - **Usage**: Stores admin data for later use in visualizations.

3. **getOrganizationNetworks**
   - **Purpose**: Fetch networks data for the selected organization.
   - **Usage**: Stores network data for later use.

4. **getOrganizationApiRequests**
   - **Purpose**: Fetch API request logs.
   - **Usage**: Provides data for API request tables and charts.

5. **getOrganizationApiRequestsOverview**
   - **Purpose**: Fetch overview data for API requests.
   - **Usage**: Updates the API request hero section.

6. **getOrganizationApiRequestsOverviewResponseCodesByInterval**
   - **Purpose**: Get API request response code overview.
   - **Usage**: Updates charts for API request response codes.

7. **getOrganizationWebhooksLogs**
   - **Purpose**: Obtain webhook logs.
   - **Usage**: Provides data for webhook tables and charts.

### Visualizations

1. **API Request Hero Section**
   - **Data Source**: `getOrganizationApiRequestsOverview`
   - **Data Properties**: Total requests, success rate, error rate.
   - **Description**: Displays a summary of API request metrics, including total requests, success rate, and error rate.

2. **API Requests Chart**
   - **Data Source**: `getOrganizationApiRequestsOverviewResponseCodesByInterval`
   - **Data Properties**: Timestamps, response codes, request counts.
   - **Description**: A stacked bar chart visualizing API requests over time, categorized by response codes. It includes tooltips for detailed information on each data point.

3. **API Requests Table**
   - **Data Source**: `getOrganizationApiRequests`
   - **Data Properties**: Method, host, path, user agent, timestamp, response code, source IP, operation ID.
   - **Description**: A detailed table listing individual API requests with sortable columns for in-depth analysis.

4. **Webhook Hero Section**
   - **Data Source**: `getOrganizationWebhooksLogs`
   - **Data Properties**: Total webhooks, success rate, failure rate.
   - **Description**: Displays a summary of webhook metrics, including total webhooks, success rate, and failure rate.

5. **Webhook History Chart**
   - **Data Source**: `getOrganizationWebhooksLogs`
   - **Data Properties**: Timestamps, webhook counts.
   - **Description**: A line chart showing the history of webhook events over time, providing insights into webhook activity trends.

6. **Webhook History By Alert Type Chart**
   - **Data Source**: `getOrganizationWebhooksLogs`
   - **Data Properties**: Alert types, timestamps, webhook counts.
   - **Description**: A stacked bar chart categorizing webhook events by alert type, allowing users to see which alert types are most common over time.

7. **Webhook Logs Table**
   - **Data Source**: `getOrganizationWebhooksLogs`
   - **Data Properties**: URL, alert type, timestamp, success/failure status.
   - **Description**: A detailed table listing individual webhook events with sortable columns for in-depth analysis.