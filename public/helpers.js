export const truncateUserAgent = (userAgent) => userAgent.length > 40 ? userAgent.substring(0, 40) + '...' : userAgent;

export const calculateTimespanSeconds = (apiRequestData) => {
    if (apiRequestData.length === 0) {
        return 0;
    }
    const timestamps = apiRequestData.map(request => new Date(request.ts).getTime());
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    return (maxTimestamp - minTimestamp);// / 1000;
};

export const formatDayKey = (date) => date.toISOString().split('T')[0];

export const formatHourKey = (date) => `${date.getUTCHours()}:00 - ${date.getUTCHours() + 1}:00`;

export const convertToSortedArray = (obj) => {
    return Object.entries(obj).map(([key, value]) => ({
        name: key,
        ...value
    })).sort((a, b) => b.success + b.failure - (a.success + a.failure));
};

export const calculateSuccessRates = (patternObject) => {
    Object.keys(patternObject).forEach(key => {
        const counts = patternObject[key];
        counts.successRate = (counts.success + counts.failure) > 0
            ? ((counts.success / (counts.success + counts.failure)) * 100).toFixed(2) + '%'
            : 'N/A';
    });
};

export const incrementPatternCount = (patternObject, key, isSuccess) => {
    if (!patternObject[key]) {
        patternObject[key] = { success: 0, failure: 0 };
    }
    isSuccess ? patternObject[key].success++ : patternObject[key].failure++;
};