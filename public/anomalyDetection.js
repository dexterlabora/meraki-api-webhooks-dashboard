// DEPRECATED - use apiRequestsMetricsSummary.js instead

/**
 * Anomaly Detection for Meraki API Usage
 * 
 * This script analyzes API request data and metrics to detect various anomalies:
 * - High failure rates
 * - Deprecated operation usage
 * - Unusual off-peak activity
 * - High traffic patterns
 * - Potential rate limit issues
 * 
 * It provides insights into API usage patterns, helping identify potential
 * issues, inefficiencies, or security concerns in API traffic.
 * 
 * @module anomalyDetection
 */

import { calculateTimespanSeconds, formatDayKey, formatHourKey, convertToSortedArray } from './helpers.js';

// Define thresholds
const FAILURE_RATE_THRESHOLD = 50; // Example threshold for failure rate
const TRAFFIC_THRESHOLD = 500; // Example threshold for high traffic
const MERAKI_API_RATE_LIMIT = 10; // Requests per second
const HIGH_ACTIVITY_THRESHOLD = 5; // Requests per second
const BURST_WINDOW = 1; // Seconds to consider for burst detection


// Helpers
const formatTime = (hour, minute) => {
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hour)}:${pad(minute)}`;
};

const truncateUserAgent = (userAgent) => userAgent.length > 40 ? userAgent.substring(0, 40) + '...' : userAgent;

// Helper function to find user agents for a specific hour
const userAgentsForHour = (hourName, metrics) => {
    return metrics["Applications"].reduce((userAgents, app) => {
        const hour = app.busiestHours?.find(h => h.name === hourName);
        if (hour) {
            userAgents.push(app.userAgent);
        }
        return userAgents;
    }, []);
};

// Helper function to find source IPs for a specific hour
const sourceIPsForHour = (hourName, metrics) => {
    return metrics.sourceIPsByHour[hourName] || [];
};

// Anomaly Detection Logic
const detectHighTrafficAnomalies = (metrics, apiRequestData) => {
    const anomalies = [];
    const ipUserAgentMap = new Map();

    // Build a map of IP addresses to user agents and their request counts
    apiRequestData.forEach(request => {
        const key = `${request.sourceIp}|${request.userAgent}`;
        if (!ipUserAgentMap.has(key)) {
            ipUserAgentMap.set(key, { count: 0, success: 0, failure: 0 });
        }
        const data = ipUserAgentMap.get(key);
        data.count++;
        if (request.responseCode >= 200 && request.responseCode < 300) {
            data.success++;
        } else {
            data.failure++;
        }
    });

    // Check for high traffic anomalies
    for (const [key, data] of ipUserAgentMap.entries()) {
        const [ip, userAgent] = key.split('|');
        if (data.count > TRAFFIC_THRESHOLD) {
            anomalies.push({
                type: "HighTraffic",
                entityType: "IPUserAgent",
                entityName: `${ip}|${truncateUserAgent(userAgent)}`,
                details: {
                    sourceIP: ip,
                    userAgent: truncateUserAgent(userAgent),
                    totalRequests: data.count,
                    successfulRequests: data.success,
                    failedRequests: data.failure,
                    successRate: ((data.success / data.count) * 100).toFixed(2) + '%',
                    threshold: TRAFFIC_THRESHOLD
                }
            });
        }
    }

    return anomalies;
};

const determineOperationScope = (opInfo) => {
    if (!opInfo || !opInfo.name) return 'Unknown';
    if (opInfo.name.includes('Administered')) return 'Administered';
    if (opInfo.name.includes('Organization')) return 'Organization';
    if (opInfo.name.includes('Network')) return 'Network';
    if (opInfo.name.includes('Device')) return 'Device';
    return 'unknown';
};

const findOrganizationScopedEquivalent = (opInfo, operationsInfo) => {
    if (!opInfo) return null;

    const baseOperationName = opInfo.operationId.replace(/device|network/i, 'organization');
    return operationsInfo.find(op =>
        op.operationId.toLowerCase().includes(baseOperationName.toLowerCase()) &&
        op.path.includes('/organizations/')
    );
};

const detectPagination = (requests) => {
    // Simple heuristic: check if there are consistent intervals between requests
    // and if there's a 'perPage' or 'startingAfter' query parameter
    const sortedRequests = requests.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const intervals = sortedRequests.slice(1).map((req, i) =>
        new Date(req.ts) - new Date(sortedRequests[i].ts)
    );

    const consistentIntervals = new Set(intervals).size < intervals.length / 2;
    const hasPaginationParams = requests.some(req => {
        if (req && req.queryString) {
            return req.queryString.includes('perPage=') || req.queryString.includes('startingAfter=');
        }
        return false;
    });

    return consistentIntervals && hasPaginationParams;
};

const analyzeHighActivityOperation = (operation, apiRequestData, operationsInfo) => {
    const operationRequests = apiRequestData.filter(req => req.operationId === operation.name);
    const opInfo = operationsInfo.find(info => info.operationId === operation.name);

    const timespan = calculateTimespanSeconds(apiRequestData);
    const isPaginating = detectPagination(operationRequests);
    const scope = determineOperationScope(operation);

    // Detect bursts of activity
    let maxBurst = 0;
    for (let i = 0; i < operationRequests.length; i++) {
        const startTime = new Date(operationRequests[i].ts).getTime();
        const endTime = startTime + BURST_WINDOW * 1000;
        const burstRequests = operationRequests.filter(req => {
            const reqTime = new Date(req.ts).getTime();
            return reqTime >= startTime && reqTime < endTime;
        });
        maxBurst = Math.max(maxBurst, burstRequests.length / BURST_WINDOW);
    }

    const isHighActivity = maxBurst >= HIGH_ACTIVITY_THRESHOLD;
    const percentOfRateLimit = ((maxBurst / MERAKI_API_RATE_LIMIT) * 100).toFixed(2);

    let analysis = {
        maxBurstFrequency: `${maxBurst.toFixed(2)} requests/second`,
        isPaginating,
        scope,
        isHighActivity,
        percentOfRateLimit: percentOfRateLimit + '%'
    };

    if (scope === 'device' || scope === 'network') {
        const orgScopedEquivalent = findOrganizationScopedEquivalent(opInfo, operationsInfo);
        if (orgScopedEquivalent) {
            analysis.recommendedAlternative = orgScopedEquivalent;
        }
    }

    return analysis;
};

const identifyScheduledPatterns = (apiRequestData) => {
    const patterns = {};
    apiRequestData.forEach(request => {
        const date = new Date(request.ts);
        const localDate = new Date(date.getTime());
        const hour = localDate.getHours();
        const minute = localDate.getMinutes();
        const timeKey = formatTime(hour, minute);

        if (!patterns[request.userAgent]) {
            patterns[request.userAgent] = {};
        }

        if (!patterns[request.userAgent][timeKey]) {
            patterns[request.userAgent][timeKey] = { success: 0, failure: 0 };
        }

        if (request.responseCode >= 200 && request.responseCode < 300) {
            patterns[request.userAgent][timeKey].success++;
        } else {
            patterns[request.userAgent][timeKey].failure++;
        }
    });

    return Object.entries(patterns).map(([userAgent, hourlyActivity]) => {
        const peakTimes = Object.entries(hourlyActivity)
            .filter(([time, counts]) => counts.success + counts.failure > TRAFFIC_THRESHOLD / 1440) // Adjusted for minutes in a day
            .map(([time, counts]) => {
                return {
                    time,
                    success: counts.success,
                    failure: counts.failure
                };
            });

        const totalSuccesses = Object.values(hourlyActivity).reduce((acc, counts) => acc + counts.success, 0);

        return {
            userAgent,
            peakTimes: peakTimes.map(peak => ({
                time: peak.time,
                success: peak.success,
                failure: peak.failure
            })),
            potentialSchedule: peakTimes.length > 0 ? `Every ${Math.floor(1440 / peakTimes.length)} min` : "No clear pattern",
            totalSuccesses
        };
    }).filter(pattern => pattern.peakTimes.length > 0);
};

const checkSuccessRate = (entity, entityType, anomalies) => {
    let rate = parseFloat(entity.successRate.replace('%', ''));
    if (rate < FAILURE_RATE_THRESHOLD) {
        anomalies.push({
            type: "HighFailureRate",
            entityType: entityType,
            entityName: entity.name || entity.adminDetails || entity.userAgent,
            details: {
                successRate: entity.successRate,
                threshold: FAILURE_RATE_THRESHOLD,
                success: entity.success,
                failure: entity.failure
            }
        });
    }
};

export const detectAnomalies = (metrics, apiRequestData, operationsInfo) => {
    let anomalies = [];

    // Check for high failure rates across all relevant keys
    ["Admins", "User Agents", "Operations", "Source IPs", "Busiest Hours", "Busiest Days", "Applications"].forEach(key => {
        if (Array.isArray(metrics[key])) {
            metrics[key].forEach(entity => checkSuccessRate(entity, key.slice(0, -1), anomalies));
        }
    });

    // Check for deprecated operations
    metrics["Operations"].forEach(operation => {
        if (operation.deprecated) {
            anomalies.push({
                type: "DeprecatedOperation",
                entityType: "Operation",
                entityName: operation.name,
                details: {
                    description: operation.description,
                    userAgents: userAgentsForOperation(operation.name, metrics)
                }
            });
        }
    });

    // Check for top 3 busiest hours
    const top3BusiestHours = metrics["Busiest Hours"]
        .sort((a, b) => (b.success + b.failure) - (a.success + a.failure))
        .slice(0, 3);

    top3BusiestHours.forEach(hour => {
        anomalies.push({
            type: "BusiestHours",
            entityType: "BusyHour",
            entityName: hour.name,
            details: {
                totalRequests: hour.success + hour.failure,
                successRate: hour.successRate,
                userAgents: userAgentsForHour(hour.name, metrics),
                sourceIPs: sourceIPsForHour(hour.name, metrics)
            }
        });
    });

    // Analyze high activity operations
    metrics["Operations"].forEach(operation => {
        const operationAnalysis = analyzeHighActivityOperation(operation, apiRequestData, operationsInfo);
        if (operationAnalysis.isHighActivity) {
            anomalies.push({
                type: "HighActivity",
                entityType: "Operation",
                entityName: operation.name,
                details: operationAnalysis
            });
        }
    });

    // Detect high traffic anomalies
    const highTrafficAnomalies = detectHighTrafficAnomalies(metrics, apiRequestData);
    anomalies.push(...highTrafficAnomalies);

    if (anomalies.length === 0) {
        anomalies.push({
            type: "NoAnomalies",
            entityType: "System",
            entityName: "All",
            details: {}
        });
    }

    applicationAnalysis(metrics["Applications"]);
    return { anomalies };
};


// anomaly detection -- new concept

const applicationAnalysis = (data) => {
    // Helper function to sort objects by a numeric property in descending order
    const sortByProperty = (arr, prop) => arr.sort((a, b) => b[prop] - a[prop]);

    // Analyze the data
    const analysis = {
        topSuccessOperations: [],
        topFailureOperations: [],
        busiestHours: [],
        busiestDays: [],
        mostActiveAdmins: [],
        mostActiveIPs: [],
        overallStats: {
            totalSuccess: 0,
            totalFailure: 0,
            overallSuccessRate: 0
        }
    };

    // Aggregate data
    const operationsMap = new Map();
    const hoursMap = new Map();
    const daysMap = new Map();
    const adminsMap = new Map();
    const ipsMap = new Map();

    data.forEach(entry => {
        // Aggregate operations
        entry.operations.forEach(op => {
            const existing = operationsMap.get(op.name) || { success: 0, failure: 0 };
            existing.success += op.success;
            existing.failure += op.failure;
            operationsMap.set(op.name, existing);
        });

        // Aggregate busiest hours and days
        entry.busiestHours.forEach(hour => {
            const existing = hoursMap.get(hour.name) || { success: 0, failure: 0 };
            existing.success += hour.success;
            existing.failure += hour.failure;
            hoursMap.set(hour.name, existing);
        });

        entry.busiestDays.forEach(day => {
            const existing = daysMap.get(day.name) || { success: 0, failure: 0 };
            existing.success += day.success;
            existing.failure += day.failure;
            daysMap.set(day.name, existing);
        });

        // Aggregate admins and IPs
        entry.admins.forEach(admin => {
            const existing = adminsMap.get(admin.details) || { success: 0, failure: 0 };
            existing.success += admin.success;
            existing.failure += admin.failure;
            adminsMap.set(admin.details, existing);
        });

        entry.sourceIps.forEach(ip => {
            const existing = ipsMap.get(ip.name) || { success: 0, failure: 0 };
            existing.success += ip.success;
            existing.failure += ip.failure;
            ipsMap.set(ip.name, existing);
        });

        // Update overall stats
        analysis.overallStats.totalSuccess += entry.success;
        analysis.overallStats.totalFailure += entry.failure;
    });

    // Calculate success rates and sort
    const calculateSuccessRate = (success, failure) => {
        const total = success + failure;
        return total > 0 ? (success / total * 100).toFixed(2) + '%' : '0.00%';
    };

    analysis.overallStats.overallSuccessRate = calculateSuccessRate(
        analysis.overallStats.totalSuccess,
        analysis.overallStats.totalFailure
    );

    const processMap = (map, limit = 5) => {
        return sortByProperty(
            Array.from(map.entries()).map(([name, stats]) => ({
                name,
                success: stats.success,
                failure: stats.failure,
                successRate: calculateSuccessRate(stats.success, stats.failure)
            })),
            'success'
        ).slice(0, limit);
    };

    analysis.topSuccessOperations = processMap(operationsMap);
    analysis.topFailureOperations = sortByProperty(processMap(operationsMap), 'failure');
    analysis.busiestHours = processMap(hoursMap);
    analysis.busiestDays = processMap(daysMap);
    analysis.mostActiveAdmins = processMap(adminsMap);
    analysis.mostActiveIPs = processMap(ipsMap);

    // Log the analysis object
    console.log("applicationAnalysis", analysis);
}
