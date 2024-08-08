/**
 * Webhook Metrics Processor
 * 
 * This module processes webhook log data to generate comprehensive metrics and analytics.
 * It analyzes various aspects of webhook activity, including URLs, network IDs, alert types,
 * and temporal patterns.
 * 
 * Key features:
 * - Aggregates and analyzes webhook log data
 * - Calculates success rates for various metrics
 * - Identifies busiest hours and days for webhook activity
 * - Generates metrics for URLs, networks, and alert types
 * - Provides sorted arrays of metrics for easy consumption by visualization components
 * 
 * Main function:
 * - getWebhookMetrics: Core function that processes webhook data and generates metrics
 * 
 * Helper functions:
 * - convertToSortedArray: Converts metric objects to sorted arrays with calculated success rates
 * - incrementCount: Utility function to increment success/failure counts in metric objects
 * 
 * The processed metrics include:
 * - URLs: Performance metrics for each webhook URL
 * - Networks: Metrics grouped by network ID
 * - Alert Types: Breakdown of webhook activity by alert type
 * - Busiest Hours: Hourly activity patterns
 * - Busiest Days: Daily activity patterns
 * 
 * This module is designed to provide comprehensive insights into webhook activity,
 * facilitating easy integration with visualization and reporting components.
 */

export const getWebhookMetrics = (webhookData) => {
    const metrics = {
        urls: {},
        networkIds: {},
        alertTypes: {},
        busiestDays: {},
        busiestHours: {}
    };

    const convertToSortedArray = (patternObject) => {
        return Object.entries(patternObject).map(([key, counts]) => {
            return {
                name: patternObject[key].name,
                success: counts.success,
                failure: counts.failure,
                successRate: ((counts.success / (counts.success + counts.failure)) * 100).toFixed(2) + '%'
            };
        }).sort((a, b) => b.success + b.failure - (a.success + a.failure));
    };

    webhookData.forEach(log => {
        const day = new Date(log.sentAt).toISOString().split('T')[0];
        const hour = new Date(log.sentAt).getHours();
        const incrementCount = (obj, key, isSuccess) => {
            if (!obj[key]) obj[key] = { success: 0, failure: 0 };
            obj[key][isSuccess ? 'success' : 'failure']++;
        };

        incrementCount(metrics.urls, log.url, log.responseCode >= 200 && log.responseCode < 300);
        incrementCount(metrics.networkIds, log.networkId, log.responseCode >= 200 && log.responseCode < 300);
        incrementCount(metrics.alertTypes, log.alertType || 'Unknown', log.responseCode >= 200 && log.responseCode < 300);
        incrementCount(metrics.busiestDays, day, log.responseCode >= 200 && log.responseCode < 300);
        incrementCount(metrics.busiestHours, `${day} ${hour}:00`, log.responseCode >= 200 && log.responseCode < 300);
    });

    // Convert counts to detailed objects with success rate calculation
    const convertToDetail = obj => {
        return Object.keys(obj).map(key => ({
            name: key,
            success: obj[key].success,
            failure: obj[key].failure,
            successRate: ((obj[key].success / (obj[key].success + obj[key].failure) * 100) || 0).toFixed(2) + '%'
        }));
    };

    return {
        "URLs": convertToSortedArray(convertToDetail(metrics.urls)),
        "Networks": convertToSortedArray(convertToDetail(metrics.networkIds)),
        "Alert Types": convertToSortedArray(convertToDetail(metrics.alertTypes)),
        "Busiest Hours": convertToSortedArray(convertToDetail(metrics.busiestHours)),
        "Busiest Days": convertToSortedArray(convertToDetail(metrics.busiestDays))
    };
};

export default getWebhookMetrics