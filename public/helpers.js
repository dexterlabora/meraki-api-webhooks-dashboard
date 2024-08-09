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

export const showLoader = () => {
    loader.style.display = 'block';
};

export const hideLoader = () => {
    loader.style.display = 'none';
};

export const getTimespanInSeconds = (timespan) => {
    const timespanInSeconds = {
        'twoHours': 7200,   // 2 hours
        'day': 86400, // 24 hours
        'week': 604800, // 7 days
        'month': 2592000 // 30 days
    };
    return timespanInSeconds[timespan] || timespanInSeconds['month']; // Default to 30 days if not specified
};

export const displayNotification = (message) => {
    const notificationBanner = document.getElementById('notificationBanner');
    notificationBanner.textContent = message;
    notificationBanner.style.display = 'block';
    setTimeout(() => {
        notificationBanner.style.display = 'none';
    }, 5000); // Hide the notification after 5 seconds
};

export const getCurrentDateAndTimespan = (timespan) => {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in ISO format
    const timespanLabels = {
        'twoHours': '2 Hours',
        'day': '1 Day',
        'week': '1 Week',
        'month': '1 Month'
    };
    const selectedTimespan = timespanLabels[timespan] || '1 Month'; // Default to 1 Month if not specified
    return `${currentDate}_${selectedTimespan}`;
};

export const calculateTimespanDates = (timespanSeconds) => {
    const endDate = new Date();
    let startDate = new Date(endDate.getTime() - timespanSeconds * 1000);
    return { startDate, endDate };
};

export const updateDateLabels = (timespanSeconds, startId, endId) => {
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
};

export const getFormatOptions = (timespanSeconds) => {
    // Timespans less than or equal to 2 hours show detailed time
    if (timespanSeconds <= 7200) {
        return { hour: '2-digit', minute: '2-digit', hour12: false }; // Use 24-hour format
    }
    // Use date only for longer timespans
    return { year: 'numeric', month: '2-digit', day: '2-digit' };
};

