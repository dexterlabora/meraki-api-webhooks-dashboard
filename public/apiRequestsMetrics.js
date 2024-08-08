/**
 * API Requests Metrics Processor
 * 
 * This module processes API request data to generate comprehensive metrics and analytics.
 * It analyzes various aspects of API usage, including user agents, operations, source IPs,
 * and admin activities.
 * 
 * Key features:
 * - Aggregates and analyzes API request data
 * - Calculates success rates for various metrics
 * - Identifies deprecated and beta operations
 * - Generates hourly and daily usage statistics
 * - Provides detailed application-specific metrics
 * - Detects anomalies in API usage patterns
 * 
 * Main functions:
 * - apiRequestsMetrics: Core function that processes API request data and generates metrics
 * - findAllUserAgentDetails: Analyzes user agent specific data
 * - identifyDeprecatedAndBetaOperations: Flags deprecated and beta API operations
 * - Various helper functions for data grouping and processing
 * 
 * This module integrates with the OpenAPI specification parser and anomaly detection
 * to provide comprehensive insights into API usage patterns and potential issues.
 */

import { fetchAndParseOpenAPISpec } from './meraki-openapi-parser.js';
import { calculateTimespanSeconds, formatDayKey, formatHourKey, convertToSortedArray, calculateSuccessRates, incrementPatternCount } from './helpers.js';
import { detectAnomalies } from './anomalyDetection.js';
import apiRequestsMetricsSummary from './apiRequestsMetricsSummary.js';



const calculateSuccessRate = (responseCode) => {
    return responseCode >= 200 && responseCode < 300 ? '100.00%' : '0.00%';
};

// Helper function to group by a given key and count successes and failures
const groupBySuccessAndFailures = (dataArray, key) => {
    return dataArray.reduce((groupedData, item) => {
        const itemKey = item[key] || "unknown";  // Defaulting to "unknown" if key is not available
        if (!groupedData[itemKey]) {
            groupedData[itemKey] = { success: 0, failure: 0 };
        }
        groupedData[itemKey][item.responseCode >= 200 && item.responseCode < 300 ? 'success' : 'failure']++;
        return groupedData;
    }, {});
};

// Function to group requests by hours and days for a specific userAgent
const groupByHourAndDayForUserAgent = (requests) => {
    const hourlyCounts = {};
    const dailyCounts = {};

    requests.forEach(request => {
        const date = new Date(request.ts);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000); // Convert to local time
        const hourKey = formatHourKey(localDate); // Use local time
        const dayKey = formatDayKey(localDate); // Use local time

        if (!hourlyCounts[hourKey]) hourlyCounts[hourKey] = { success: 0, failure: 0 };
        if (!dailyCounts[dayKey]) dailyCounts[dayKey] = { success: 0, failure: 0 };

        const countType = request.responseCode >= 200 && request.responseCode < 300 ? 'success' : 'failure';
        hourlyCounts[hourKey][countType]++;
        dailyCounts[dayKey][countType]++;
    });

    const calculateSuccessRate = (counts) => {
        const total = counts.success + counts.failure;
        return total > 0 ? ((counts.success / total) * 100).toFixed(2) + '%' : '0.00%';
    };

    const hourlyCountsArray = convertToSortedArray(hourlyCounts).map(hour => ({
        ...hour,
        successRate: calculateSuccessRate(hour)
    }));

    const dailyCountsArray = convertToSortedArray(dailyCounts).map(day => ({
        ...day,
        successRate: calculateSuccessRate(day)
    }));

    return {
        hourlyCounts: hourlyCountsArray,
        dailyCounts: dailyCountsArray
    };
};

const findAdminDetails = (adminId, merakiAdmins) => {
    const admin = merakiAdmins.find(admin => admin.id === adminId);
    return admin ? `${admin.name} (${admin.email})` : 'None';
};

const addAdminInfo = (adminArray, merakiAdmins) => {
    return adminArray.map(item => ({
        ...item,
        adminDetails: findAdminDetails(item.name, merakiAdmins),
        successRate: item.success + item.failure > 0 ?
            ((item.success / (item.success + item.failure)) * 100).toFixed(2) : '0'
    }));
};

const findAllUserAgentDetails = (userAgentsCounts, apiRequestData, merakiAdmins) => {
    return Object.entries(userAgentsCounts).map(([userAgent, counts]) => {
        const filteredApiRequests = apiRequestData.filter(request => request.userAgent === userAgent);

        // Group by hour and day for the specific userAgent
        const { hourlyCounts, dailyCounts } = groupByHourAndDayForUserAgent(filteredApiRequests);

        // Collecting unique adminIds from the filtered requests
        const adminIdsForUserAgent = [...new Set(filteredApiRequests.map(req => req.adminId))];

        // Construct an object mapping adminIds to their success/failure counts
        const adminStats = adminIdsForUserAgent.reduce((acc, adminId) => {
            acc[adminId] = { success: 0, failure: 0 };
            filteredApiRequests.forEach(request => {
                if (request.adminId === adminId) {
                    if (request.responseCode >= 200 && request.responseCode < 300) {
                        acc[adminId].success++;
                    } else {
                        acc[adminId].failure++;
                    }
                }
            });
            acc[adminId].successRate = ((acc[adminId].success / (acc[adminId].success + acc[adminId].failure)) * 100).toFixed(2) + '%';
            return acc;
        }, {});

        // Extract the detailed information for each admin associated with the user agent
        const adminsDetails = adminIdsForUserAgent.map(adminId => {
            const adminInfo = findAdminDetails(adminId, merakiAdmins);
            const adminData = adminStats[adminId];
            return {
                details: adminInfo || 'None',
                success: adminData.success,
                failure: adminData.failure,
                successRate: adminData.successRate
            };
        }).filter(admin => admin.details !== 'None'); // Filter out any 'None' entries

        // Calculate success rates for operations and source IPs
        const operations = convertToSortedArray(groupBySuccessAndFailures(filteredApiRequests, 'operationId')).map(op => ({
            ...op,
            successRate: ((op.success / (op.success + op.failure)) * 100).toFixed(2) + '%'
        }));

        const sourceIps = convertToSortedArray(groupBySuccessAndFailures(filteredApiRequests, 'sourceIp')).map(ip => ({
            ...ip,
            successRate: ((ip.success / (ip.success + ip.failure)) * 100).toFixed(2) + '%'
        }));

        return {
            userAgent,
            operations,
            sourceIps,
            admins: adminsDetails,
            busiestHours: hourlyCounts,
            busiestDays: dailyCounts,
            success: counts.success,
            failure: counts.failure,
            successRate: ((counts.success + counts.failure) > 0 ? ((counts.success / (counts.success + counts.failure)) * 100).toFixed(2) + '%' : 'N/A')
        };
    }).sort((a, b) => b.success + b.failure - (a.success + a.failure));
};

const getValidISODate = (timestamp) => {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? "Invalid timestamp" : date.toISOString();
};

const identifyDeprecatedAndBetaOperations = (metrics, operationsInfo) => {
    const deprecatedOperations = [];
    const betaOperations = [];

    metrics.Operations.forEach(operation => {
        const opInfo = operationsInfo.find(info => info.operationId === operation.name);
        if (opInfo) {
            if (opInfo.deprecated) {
                deprecatedOperations.push(operation);
            }
            if (opInfo.tags.includes('beta')) {
                betaOperations.push(operation);
            }
        }
    });

    return { deprecatedOperations, betaOperations };
};

// Add this function to group source IPs by hour
const groupSourceIPsByHour = (apiRequestData) => {
    const sourceIPsByHour = {};
    apiRequestData.forEach(request => {
        const date = new Date(request.ts);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        const hourKey = formatHourKey(localDate);
        if (!sourceIPsByHour[hourKey]) {
            sourceIPsByHour[hourKey] = new Set();
        }
        sourceIPsByHour[hourKey].add(request.sourceIp);
    });
    
    // Convert Sets to Arrays
    for (const hour in sourceIPsByHour) {
        sourceIPsByHour[hour] = Array.from(sourceIPsByHour[hour]);
    }
    
    return sourceIPsByHour;
};

const apiRequestsMetrics = async function (apiRequestData, merakiAdmins = []) {
    const operationsInfo = await fetchAndParseOpenAPISpec();
    console.log("API Parsed, operationsInfo", operationsInfo)

    let userAgentsCounts = {};
    let sourceIpCounts = {};
    let operationIdCounts = {};
    let hourlyCounts = {};
    let dailyCounts = {};
    let adminIdCounts = {};

    apiRequestData.forEach(request => {
        const isSuccess = request.responseCode >= 200 && request.responseCode < 300;
        const userAgentKey = request.userAgent;
        const sourceIpKey = request.sourceIp;
        const operationIdKey = request.operationId;
        const adminIdKey = request.adminId;
        const date = new Date(request.ts);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000); // Convert to local time
        const dayKey = formatDayKey(localDate); // Use local time
        const hourKey = formatHourKey(localDate); // Use local time

        incrementPatternCount(userAgentsCounts, userAgentKey, isSuccess);
        incrementPatternCount(sourceIpCounts, sourceIpKey, isSuccess);
        incrementPatternCount(operationIdCounts, operationIdKey, isSuccess);
        incrementPatternCount(adminIdCounts, adminIdKey, isSuccess);
        incrementPatternCount(hourlyCounts, hourKey, isSuccess);
        incrementPatternCount(dailyCounts, dayKey, isSuccess);
    });

    calculateSuccessRates(userAgentsCounts);
    calculateSuccessRates(sourceIpCounts);
    calculateSuccessRates(operationIdCounts);
    calculateSuccessRates(adminIdCounts);
    calculateSuccessRates(hourlyCounts);
    calculateSuccessRates(dailyCounts);

    const applicationsDetails = findAllUserAgentDetails(userAgentsCounts, apiRequestData, merakiAdmins);

    const operationsCounts = convertToSortedArray(operationIdCounts).map(operation => {
        const opInfo = operationsInfo.find(info => info.operationId === operation.name);
        return {
            name: operation.name,
            description: opInfo ? opInfo.description : '',
            success: operation.success,
            failure: operation.failure,
            successRate: operation.successRate,
            deprecated: opInfo ? opInfo.deprecated : false
        };
    });


    const metrics = {
        "Admins": addAdminInfo(convertToSortedArray(adminIdCounts),merakiAdmins),
        "User Agents": convertToSortedArray(userAgentsCounts),
        "Operations": operationsCounts,
        "Source IPs": convertToSortedArray(sourceIpCounts),
        "Busiest Hours": convertToSortedArray(hourlyCounts),
        "Busiest Days": convertToSortedArray(dailyCounts),
        "Applications": applicationsDetails,
        "meta": {
            numberOfRequests: apiRequestData.length,
            timespan: calculateTimespanSeconds(apiRequestData),
            dateCreated: new Date().toISOString(),
            startTime: getValidISODate(apiRequestData[0]?.ts) || "Invalid timestamp",
            endTime: getValidISODate(apiRequestData[apiRequestData.length - 1]?.ts) || "Invalid timestamp"
        },
        sourceIPsByHour: groupSourceIPsByHour(apiRequestData)
    };

    const { deprecatedOperations, betaOperations } = identifyDeprecatedAndBetaOperations(metrics, operationsInfo);
    metrics["Deprecated Operations"] = deprecatedOperations;
    metrics["Beta Operations"] = betaOperations;

   // const metricsSummary = detectAnomalies(metrics, apiRequestData, operationsInfo);

    metrics["Summary"] = apiRequestsMetricsSummary(applicationsDetails);


    console.log("apiRequestsMetrics metrics", metrics);
    return metrics;
};

export default apiRequestsMetrics;