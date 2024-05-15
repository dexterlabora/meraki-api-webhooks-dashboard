
### Application Description

#### Overview
The application serves as a monitoring dashboard that connects with the Meraki Dashboard API to provide real-time insights into API and webhook activities. It visualizes API usage metrics and webhook logs, helping network administrators to better understand and manage their network's integrations and alerts.

#### Key Features
1. **API Key and Organization Configuration**
   - Users can securely input and store their Meraki API key and select their organization from a dynamically populated dropdown. This configuration is essential for customizing the dashboard to reflect specific organizational data.

2. **API Usage Visualization**
   - The dashboard visualizes API request data, including requests grouped by response code and detailed API request logs. It allows filtering by user agent, admin, operation, and source IP to drill down into specific data points.
   - Time filters (e.g., last 2 hours, day, week, month) provide temporal control over the data displayed, offering insights into usage patterns over time.

3. **Webhook Monitoring**
   - Similar to API usage, webhook activities are logged and visualized. The application tracks webhook data by receiver URL and alert type, displaying success and failure rates alongside response times.
   - Filters for webhook logs include network ID, URL, and alert type, providing a granular view of webhook performance and reliability.

4. **Dynamic Data Updates**
   - The application features real-time data fetching from the Meraki API, ensuring that the displayed information is current. It supports handling paginated API responses efficiently, adapting to large datasets.

5. **Interactive Elements**
   - Interactive forms for API and webhook configurations enhance user engagement, allowing for on-the-fly adjustments to the data being monitored.
   - Visual charts and graphs provide intuitive insights into API and webhook performance metrics, making the data accessible to users with varying levels of technical expertise.


### Technologies Used
- **Frontend**: HTML, CSS, JavaScript (utilizing Chart.js for visualizations and Axios for HTTP requests).
- **Backend**: Node.js server using Express.js framework to handle routing and API request proxying.
- **API Integration**: Cisco Meraki Dashboard API.

### Potential Enhancements
- **User Authentication**: Implement user authentication to securely manage access to the dashboard.
- **Extended API Coverage**: Expand the number of Meraki API endpoints the dashboard interacts with for broader monitoring capabilities.
- **Advanced Analytical Tools**: Incorporate machine learning algorithms to predict trends and detect anomalies in API usage and webhook activity.

