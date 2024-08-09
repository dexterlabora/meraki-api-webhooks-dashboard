export function updateApiRequestTable(data) {
    if (!Array.isArray(data)) {
        console.error('Invalid data passed to updateApiRequestTable:', data);
        return;
    }

    let admins = [];
    try {
        admins = JSON.parse(localStorage.getItem('MerakiAdmins')) || [];
    } catch (error) {
        console.error('Error parsing admin data:', error);
    }

    const adminMap = new Map(admins.map(admin => [admin.id, admin]));
    const tbody = document.querySelector('#apiRequestTable tbody');

    tbody.innerHTML = data.map(request => {
        const admin = adminMap.get(request.adminId) || {};
        return `
            <tr>
                <td>${request.ts}</td>
                <td>${admin.name || 'Unknown'} (${admin.email || 'No email'})</td>
                <td>${request.operationId}</td>
                <td>${request.sourceIp}</td>
                <td>${request.responseCode}</td>
                <td>${request.userAgent}</td>
                <td>${request.path}</td>
                <td>${request.queryString}</td>
            </tr>
        `;
    }).join('');
    updateRecordCount('apiRequestTable');
}

export function updateRecordCount(tableId) {
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