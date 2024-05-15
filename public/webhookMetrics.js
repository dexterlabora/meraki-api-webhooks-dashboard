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