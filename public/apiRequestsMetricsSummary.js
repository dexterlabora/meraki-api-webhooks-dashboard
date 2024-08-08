const apiRequestsMetricsSummary = (data) => {
    // Helper function to sort objects by a numeric property in descending order
    const sortByProperty = (arr, prop) => arr.sort((a, b) => b[prop] - a[prop]);

    // Analyze the data
    const summary = {
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
        summary.overallStats.totalSuccess += entry.success;
        summary.overallStats.totalFailure += entry.failure;
    });

    // Calculate success rates and sort
    const calculateSuccessRate = (success, failure) => {
        const total = success + failure;
        return total > 0 ? (success / total * 100).toFixed(2) + '%' : '0.00%';
    };

    summary.overallStats.overallSuccessRate = calculateSuccessRate(
        summary.overallStats.totalSuccess,
        summary.overallStats.totalFailure
    );

    const processMap = (map, limit = 5, failureOnly = false) => {
        return sortByProperty(
            Array.from(map.entries())
                .map(([name, stats]) => ({
                    name,
                    success: stats.success,
                    failure: stats.failure,
                    successRate: calculateSuccessRate(stats.success, stats.failure),
                    failureRate: calculateSuccessRate(stats.failure, stats.success)
                }))
                .filter(item => !failureOnly || parseFloat(item.failureRate) > 0),
            failureOnly ? 'failure' : 'success'
        ).slice(0, limit);
    };

    summary.topSuccessOperations = processMap(operationsMap);
    summary.topFailureOperations = processMap(operationsMap, 5, true);
    summary.busiestHours = processMap(hoursMap);
    summary.busiestDays = processMap(daysMap);
    summary.mostActiveAdmins = processMap(adminsMap);
    summary.mostActiveIPs = processMap(ipsMap);

    // Log the summary object
    console.log("apiRequestsMetricsSummary", summary);
    return summary;
}

export default apiRequestsMetricsSummary;