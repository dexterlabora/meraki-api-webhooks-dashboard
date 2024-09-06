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

## API Requests Metrics

The `apiRequestsMetrics` function in `apiRequestsMetrics.js` processes API request data to generate comprehensive metrics and analytics. This function would ideally be exposed as an API endpoint to provide computed information for various dashboard components.

### Key Properties Returned

1. **Admins**: Information about admin activity
   - `name`: Admin ID
   - `adminDetails`: Admin name and email
   - `success`: Number of successful requests
   - `failure`: Number of failed requests
   - `successRate`: Percentage of successful requests

2. **User Agents**: Metrics for different user agents
   - `name`: User agent string
   - `success`: Number of successful requests
   - `failure`: Number of failed requests
   - `successRate`: Percentage of successful requests

3. **Operations**: Details about API operations
   - `name`: Operation ID
   - `description`: Operation description
   - `success`: Number of successful requests
   - `failure`: Number of failed requests
   - `successRate`: Percentage of successful requests
   - `deprecated`: Boolean indicating if the operation is deprecated

4. **Source IPs**: Metrics for different source IP addresses
   - `name`: Source IP address
   - `success`: Number of successful requests
   - `failure`: Number of failed requests
   - `successRate`: Percentage of successful requests

5. **Busiest Hours** and **Busiest Days**: Time-based metrics
   - `name`: Hour or day
   - `success`: Number of successful requests
   - `failure`: Number of failed requests
   - `successRate`: Percentage of successful requests

6. **Applications**: Detailed metrics for each application (user agent)
   - `userAgent`: User agent string
   - `operations`: Array of operation metrics
   - `sourceIps`: Array of source IP metrics
   - `admins`: Array of admin metrics
   - `busiestHours`: Array of hourly metrics
   - `busiestDays`: Array of daily metrics
   - `success`: Total successful requests
   - `failure`: Total failed requests
   - `successRate`: Overall success rate

7. **Deprecated Operations** and **Beta Operations**: Lists of special operations
   - Contains the same properties as the Operations metrics

8. **Meta**: Overall metadata
   - `numberOfRequests`: Total number of requests
   - `timespan`: Time span of the data in seconds
   - `dateCreated`: Date when the metrics were generated
   - `startTime`: Start time of the data range
   - `endTime`: End time of the data range

9. **Source IPs by Hour**: Grouping of source IPs for each hour
   - Key: Hour in format "YYYY-MM-DD HH:00"
   - Value: Array of unique source IPs active in that hour

10. **Summary**: High-level summary of the metrics (generated by `apiRequestsMetricsSummary`)

### Related Metric Cards/Charts

1. **Admin Activity Card**
   - Data source: `Admins` property
   - Displays a table or chart showing admin activity, including success rates and request counts

2. **User Agents Distribution Chart**
   - Data source: `User Agents` property
   - Visualizes the distribution of requests across different user agents

3. **Top Operations Chart**
   - Data source: `Operations` property
   - Shows the most frequently used API operations and their success rates

4. **Source IP Heatmap**
   - Data source: `Source IPs` and `Source IPs by Hour` properties
   - Displays a heatmap of API request activity by source IP and time

5. **Hourly and Daily Activity Charts**
   - Data source: `Busiest Hours` and `Busiest Days` properties
   - Line or bar charts showing API request patterns over time

6. **Application-specific Dashboard**
   - Data source: `Applications` property
   - Detailed metrics for each application, including charts for operations, source IPs, and time-based activity

7. **Deprecated and Beta Operations Alerts**
   - Data source: `Deprecated Operations` and `Beta Operations` properties
   - Displays warnings or informational cards about the usage of deprecated or beta API operations

8. **Overall Metrics Summary**
   - Data source: `Meta` and `Summary` properties
   - Provides a high-level overview of API usage, including total requests, overall success rate, and key insights

