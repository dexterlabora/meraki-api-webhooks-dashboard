export function updateWebhookLogsTable(data) {
    const tbody = document.querySelector('#webhookLogsTable tbody');  // Ensure you have an id for your webhook table

    tbody.innerHTML = data.map(log => `
        <tr>
            <td>${new Date(log.loggedAt).toLocaleString()}</td>
            <td>${log.networkId}</td>
            <td>${log.alertType}</td>     
            <td>${log.responseCode}</td>
            <td>${log.responseDuration}</td>
            <td>${log.url}</td>
        </tr>
    `).join('');
    updateRecordCount('webhookLogsTable');
}

function updateRecordCount(tableId) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with ID '${tableId}' not found.`);
        return;
    }

    const totalRecordsId = tableId === 'apiRequestTable' ? 'totalApiRecords' : 'totalWebhookRecords';
    const totalRecordsSpan = document.getElementById(totalRecordsId);
    const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none').length;
    totalRecordsSpan.textContent = visibleRows;
}