//const apiRequestData = require("../mockData/getOrganizationApiRequests-sandbox.json")

import fetchAndParseOpenAPISpec from './meraki-openapi-parser.js';


// Helper Functions
const truncateUserAgent = (userAgent) => userAgent.length > 40 ? userAgent.substring(0, 40) + '...' : userAgent;


// Define thresholds
const FAILURE_RATE_THRESHOLD = 50; // Example threshold for failure rate
const TRAFFIC_THRESHOLD = 500; // Example threshold for high traffic
const SUCCESS_RATE_THRESHOLD = 80; // Example threshold for considering a success of request counts
const RATE_LIMIT_PER_SECOND = 10; // Meraki API rate limit
const INITIAL_BURST_LIMIT = 15; // Allowed initial burst


// // Function to calculate the timespan in seconds from API request data
function calculateTimespanSeconds(apiRequestData) {
    if (apiRequestData.length === 0) {
        return 0;
    }
    const timestamps = apiRequestData.map(request => new Date(request.ts).getTime());
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    return (maxTimestamp - minTimestamp) / 1000; // Convert milliseconds to seconds
}


// Function to find the largest burst of consecutive requests
function findLargestRequestBurst(requests) {
    // Only consider successful requests
    const successfulRequests = requests.filter(req => req.responseCode >= 200 && req.responseCode < 300);

    // Sort requests by timestamp
    successfulRequests.sort((a, b) => new Date(a.ts) - new Date(b.ts));

    let currentBurst = 0;
    let maxBurst = 0;
    let burstStartTime = null;

    for (const request of successfulRequests) {
        const timestamp = new Date(request.ts).getTime();
        if (!burstStartTime) {
            burstStartTime = timestamp;
            currentBurst++;
        } else if (timestamp - burstStartTime <= 1000) {
            // If within 5 second window, increase current burst count
            currentBurst++;
        } else {
            // If beyond 1 second, reset burstStartTime and currentBurst
            burstStartTime = timestamp;
            currentBurst = 1;
        }
        // Update maxBurst if currentBurst exceeds it
        if (currentBurst > maxBurst) {
            maxBurst = currentBurst;
        }
    }




    let averageBurstRate;
    if (maxBurst > INITIAL_BURST_LIMIT) {
        // Average out the burst rate considering the initial allowance and the sustained rate
        averageBurstRate = (INITIAL_BURST_LIMIT + (maxBurst - INITIAL_BURST_LIMIT) / RATE_LIMIT_PER_SECOND);
    } else {
        averageBurstRate = maxBurst;
    }

    return averageBurstRate;
}


// Main function to return API Request Metrics
const apiRequestsMetrics = async function apiRequestsMetrics(apiRequestData, merakiAdmins = []) {
    // Fetch the OpenAPI spec information
    const operationsInfo = await fetchAndParseOpenAPISpec();
   // console.log("operationsInfo ",operationsInfo);


    // New function to identify deprecated and beta operations
    const identifyDeprecatedAndBetaOperations = (metrics, operationsInfo) => {
        const deprecatedOperations = [];
        const betaOperations = [];

        metrics["Operation IDs"].forEach(operation => {
            const opInfo = operationsInfo.find(info => info.operationId === operation.name);
            if (opInfo) {
                if (opInfo.deprecated) {
                    deprecatedOperations.push({
                        ...operation,
                        description: opInfo.description
                    });
                } else if (opInfo.tags.includes('beta')) {
                    betaOperations.push({
                        ...operation,
                        description: opInfo.description
                    });
                }
            }
        });

        return { deprecatedOperations, betaOperations };
    };

    const convertToSortedArray = (patternObject) => {
        return Object.entries(patternObject).map(([key, counts]) => {
            return {
                name: key || "",
                success: counts.success,
                failure: counts.failure,
                successRate: ((counts.success / (counts.success + counts.failure)) * 100).toFixed(2) + '%'
            };
        }).sort((a, b) => b.success + b.failure - (a.success + a.failure));
    };

    // Utility Functions
    const formatHourKey = (date) => `${date.getUTCHours()}:00 - ${date.getUTCHours() + 1}:00`;
    const formatDayKey = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD format

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
            const hourKey = formatHourKey(date);
            const dayKey = formatDayKey(date);

            if (!hourlyCounts[hourKey]) hourlyCounts[hourKey] = { success: 0, failure: 0 };
            if (!dailyCounts[dayKey]) dailyCounts[dayKey] = { success: 0, failure: 0 };

            const countType = request.responseCode >= 200 && request.responseCode < 300 ? 'success' : 'failure';
            hourlyCounts[hourKey][countType]++;
            dailyCounts[dayKey][countType]++;
        });

        return {
            hourlyCounts: convertToSortedArray(hourlyCounts),
            dailyCounts: convertToSortedArray(dailyCounts)
        };
    };

    // Application Metrics Calculation
    const findAllUserAgentDetails = (userAgentsCounts, apiRequestData, adminsData) => {

        // Parse admin data once and for all
        //  const parsedMerakiAdmins = typeof merakiAdmins === 'string' ? JSON.parse(merakiAdmins) : merakiAdmins;
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
                const adminInfo = findAdminDetails(adminId, adminsData);
                const adminData = adminStats[adminId];
                return {
                    details: adminInfo || 'None',
                    success: adminData.success,
                    failure: adminData.failure,
                    successRate: adminData.successRate
                };
            }).filter(admin => admin.details !== 'None'); // Filter out any 'None' entries

            return {
                userAgent,
                operations: convertToSortedArray(groupBySuccessAndFailures(filteredApiRequests, 'operationId')),
                sourceIps: convertToSortedArray(groupBySuccessAndFailures(filteredApiRequests, 'sourceIp')),
                admins: adminsDetails,
                busiestHours: hourlyCounts,
                busiestDays: dailyCounts,
                success: counts.success,
                failure: counts.failure,
                successRate: ((counts.success + counts.failure) > 0 ? ((counts.success / (counts.success + counts.failure)) * 100).toFixed(2) + '%' : 'N/A')
            };
        }).sort((a, b) => b.success + b.failure - (a.success + a.failure));
    };


    let userAgentsCounts = {};
    let sourceIpCounts = {};
    let operationIdCounts = {};
    let hourlyCounts = {};
    let dailyCounts = {};
    let adminIdCounts = {};

    const incrementPatternCount = (patternObject, key, isSuccess) => {
        if (!patternObject[key]) {
            patternObject[key] = { success: 0, failure: 0 };
        }
        isSuccess ? patternObject[key].success++ : patternObject[key].failure++;
    };


    const calculateSuccessRates = (patternObject) => {
        Object.keys(patternObject).forEach(key => {
            const counts = patternObject[key];
            counts.successRate = (counts.success + counts.failure) > 0
                ? ((counts.success / (counts.success + counts.failure)) * 100).toFixed(2) + '%'
                : 'N/A';
        });
    };

    apiRequestData.forEach(request => {
        const isSuccess = request.responseCode >= 200 && request.responseCode < 300;
        const userAgentKey = request.userAgent;
        const sourceIpKey = request.sourceIp;
        const operationIdKey = request.operationId;
        const adminIdKey = request.adminId;
        const date = new Date(request.ts);
        //  const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayKey = formatDayKey(date);
        //  const hourKey = `${date.getUTCHours()}:00 - ${date.getUTCHours() + 1}:00`;
        const hourKey = formatHourKey(date);
        // Increment counts for user agents, source IPs, operation IDs, and admins
        incrementPatternCount(userAgentsCounts, userAgentKey, isSuccess);
        incrementPatternCount(sourceIpCounts, sourceIpKey, isSuccess);
        incrementPatternCount(operationIdCounts, operationIdKey, isSuccess);
        incrementPatternCount(adminIdCounts, adminIdKey, isSuccess);

        // Increment counts for hours and days
        incrementPatternCount(hourlyCounts, hourKey, isSuccess);
        incrementPatternCount(dailyCounts, dayKey, isSuccess);
    });



    // Find admin details by admin ID
    const findAdminDetails = (adminId) => {
        const admin = merakiAdmins.find(admin => admin.id === adminId);
        return admin ? `${admin.name} (${admin.email})` : 'None';
    };

    const addAdminInfo = (adminArray) => {
        return adminArray.map(item => ({
            ...item,
            adminDetails: findAdminDetails(item.name),
            successRate: item.success + item.failure > 0 ?
                ((item.success / (item.success + item.failure)) * 100).toFixed(2) : '0'
        }));
    };


    calculateSuccessRates(userAgentsCounts);
    calculateSuccessRates(sourceIpCounts);
    calculateSuccessRates(operationIdCounts);
    calculateSuccessRates(adminIdCounts);
    calculateSuccessRates(hourlyCounts);
    calculateSuccessRates(dailyCounts);


    const applicationsDetails = findAllUserAgentDetails(userAgentsCounts, apiRequestData, merakiAdmins);

    // Convert the operation counts into the desired format and add metadata from operationsInfo
    const operationsCounts = convertToSortedArray(operationIdCounts).map(operation => {
        const opInfo = operationsInfo.find(info => info.operationId === operation.name);
        return {
            name: operation.name,
            description: opInfo ? opInfo.description : '', // Insert description from parsed OpenAPI spec
            success: operation.success,
            failure: operation.failure,
            successRate: operation.successRate,
            deprecated: opInfo ? opInfo.deprecated : false
        };
    });
    // Update the metrics object to include the new "Applications" property
    const metrics = {
        "Admins": addAdminInfo(convertToSortedArray(adminIdCounts)),
        "User Agents": convertToSortedArray(userAgentsCounts),
        "Operations": operationsCounts,
        "Operation IDs": convertToSortedArray(operationIdCounts),
        "Source IPs": convertToSortedArray(sourceIpCounts),
        "Busiest Hours": convertToSortedArray(hourlyCounts),
        "Busiest Days": convertToSortedArray(dailyCounts),
        "Applications": applicationsDetails,
    };

    const { deprecatedOperations, betaOperations } = identifyDeprecatedAndBetaOperations(metrics, operationsInfo);

    // Add new metrics for deprecated and beta operations
    metrics["Deprecated Operations"] = deprecatedOperations;
    metrics["Beta Operations"] = betaOperations;


    const detectAnomalies = (metrics, apiRequestData) => {
        let anomalies = [];
        let successes = [];




        // Check for high failure rates in operations
        metrics["Admins"].forEach(admin => {
            let rate = parseFloat(admin.successRate.replace('%', ''));
            if (rate < FAILURE_RATE_THRESHOLD) {
                anomalies.push(`High failure rate detected for admin <b><code>${admin.adminDetails}</code></b> with a success rate of <span class="rate-fail">${admin.successRate}</span>`);
            } else if (rate >= SUCCESS_RATE_THRESHOLD) {
                successes.push(`Healthy admin usage detected: <b><code>${admin.name}</code></b>with a success rate of <span class="rate-success">${admin.successRate}</span>`);
            }
        });


            // Function to find user agents for a specific operation
            const userAgentsForOperation = (operationName) => {
                return metrics["Applications"].reduce((userAgents, app) => {
                    const operation = app.operations.find(op => op.name === operationName);
                    if (operation) {
                        userAgents.push(app.userAgent);
                    }
                    return userAgents;
                }, []);
            };
        metrics["Operations"].forEach(operation => {
            let rate = parseFloat(operation.successRate.replace('%', ''));
            if (rate < FAILURE_RATE_THRESHOLD) {
                anomalies.push(`<b><code>${operation.name}</code></b> has a low success rate of <span class="rate-fail">${operation.successRate}</span>`);
            } else if (rate >= SUCCESS_RATE_THRESHOLD) {
                successes.push(`Healthy operation detected: <b><code>${operation.name}</code></b>with a success rate of <span class="rate-success">${operation.successRate}</span>`);
            }
    
            if (operation.deprecated) {
                anomalies.push(`Deprecated operation in use: <b><code>${operation.name}</code></b> (${operation.description}) by user agents: ${userAgentsForOperation(operation.name).join(', ')}`);
            }

        });

        // // Check for high failure rates in operations
        // metrics["Operation IDs"].forEach(operation => {
        //     let rate = parseFloat(operation.successRate.replace('%', ''));
        //     if (rate < FAILURE_RATE_THRESHOLD) {
        //         anomalies.push(`<b><code>${operation.name}</code></b> has a low success rate of <span class="rate-fail">${operation.successRate}</span>`);
        //     } else if (rate >= SUCCESS_RATE_THRESHOLD) {
        //         successes.push(`Healthy operation detected: <b><code>${operation.name}</code></b>with a success rate of <span class="rate-success">${operation.successRate}</span>`);
        //     }
        // });

        // // Check for usage of deprecated operations
        // metrics["Deprecated Operations"].forEach(operation => {
        //     anomalies.push(`Deprecated operation in use: <b><code>${operation.name}</code></b> (${operation.description})`);
        // });

        // Check for usage of beta operations
        metrics["Beta Operations"].forEach(operation => {
            anomalies.push(`Beta operation in use: <b><code>${operation.name}</code></b> (${operation.description})`);
        });

        // Check for unusual traffic in user agents
        metrics["User Agents"].forEach(userAgent => {
            //  if (userAgent.success + userAgent.failure > TRAFFIC_THRESHOLD) {
            if (userAgent.success > TRAFFIC_THRESHOLD) {
                anomalies.push(`<b>${truncateUserAgent(userAgent.name)}</b> is experiencing unusually high traffic with <b>${userAgent.success}</b> requests <b></b>`);
            } else {
                successes.push(`<b>${truncateUserAgent(userAgent.name)}</b> is operating within reason.</b>`);
            }
        });

        //  Rate limit warning -- Works, but may need improvement. .. and its noisy
        // metrics["User Agents"].forEach(userAgent => {
        //     const userAgentRequests = apiRequestData.filter(request => request.userAgent === userAgent.name);
        //     const burstRate = findLargestRequestBurst(userAgentRequests);

        //     if (burstRate > RATE_LIMIT_PER_SECOND) {
        //         anomalies.push(`<b>${truncateUserAgent(userAgent.name)}</b> may hit rate limits with bursts up to ${burstRate.toFixed(2)} requests per second.`);
        //     } else {
        //         successes.push(`<b>${truncateUserAgent(userAgent.name)}</b> operates within safe limits at ${burstRate.toFixed(2)} requests per second.`);
        //     }
        // });

        if (anomalies.length === 0) {
            anomalies.push("All metrics are good. No anomalies detected.");
        }

        // Check for unusual activity in source IPs
        metrics["Source IPs"].forEach(ip => {
            if (ip.success + ip.failure > TRAFFIC_THRESHOLD) {
                anomalies.push(`<b>${ip.name}</b> is experiencing unusually high traffic with <b>${ip.success + ip.failure}</b> requests`);
            }
        });

        // Check for unusual activity during off-peak hours
        metrics["Busiest Hours"].forEach(hour => {
            const hourInt = parseInt(hour.name.split(':')[0], 10);
            if ((hourInt < 8 || hourInt > 20) && (hour.success + hour.failure > TRAFFIC_THRESHOLD)) {
                anomalies.push(`High activity detected during off-peak hours at <b>${hour.name}</b>`);
            }
        });

        // Check for successful patterns
        if (anomalies.length === 0) {
            anomalies.push("All metrics are good. No anomalies detected.");
        }

        return { anomalies, successes };
    };

    //const timespanSeconds = calculateTimespanSeconds(apiRequestData);
    const metricsSummary = detectAnomalies(metrics, apiRequestData);
    metrics["Summary"] = metricsSummary;

    console.log("apiRequestsMetrics metrics", metrics)
    return metrics;
};


export default apiRequestsMetrics;