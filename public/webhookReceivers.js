import API from './apiHandlers.js';

function initWebhookReceiversListeners() {
    console.log("initWebhookReceiversListeners")
    const document = window.document;
    const api = new API(localStorage.getItem('MerakiApiKey'));

    loadWebhookReceivers(api);

    const addReceiverBtn = document.getElementById('addReceiverBtn');
    const modal = document.getElementById('receiverModal');
    const closeModal = document.querySelector('.close-receiver-modal');
    const form = document.getElementById('receiverForm');

    // Open modal for adding new receiver
    addReceiverBtn.addEventListener('click', () => {
        console.log("addReceiverBtn")
        form.reset(); // Reset form for new entry
        modal.style.display = 'block';
    });

    // Close modal -- in primary script.js
    closeModal.addEventListener('click', () => {
        console.log("addReceiverBtn close")
        modal.style.display = 'none';
    });

    // Handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const newReceiverData = {
            name: document.getElementById('name').value,
            url: document.getElementById('url').value,
            sharedSecret: document.getElementById('sharedSecret').value,
            payloadTemplate: document.getElementById('payloadTemplate').value
        };
        api.createOrganizationWebhooksHttpServer(localStorage.getItem('MerakiOrganizationId'), newReceiverData)
            .then(() => {
                loadWebhookReceivers(api);
                modal.style.display = 'none';
            })
            .catch(error => console.error('Error adding receiver:', error));
    });
}

// Function to load webhook data
function loadWebhookReceivers(api) {
    console.log("loadWebhookReceivers");
    const document = window.document;
    const organizationId = localStorage.getItem('MerakiOrganizationId');
    api.getOrganizationWebhooksHttpServers(organizationId)
        .then(webhooksData => {
            const table = document.getElementById('webhookReceiversTable');
            if (table) {
                const tbody = table.querySelector('tbody');
                tbody.innerHTML = ''; // Clear existing rows
                webhooksData.forEach(webhook => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${webhook.name}</td>
                        <td class="url-column">${webhook.url}</td>
                        <td>********</td>
                        <td>${webhook.payloadTemplate.name}</td>
                        <td><button>Options</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Failed to load webhooks:', error));
}

export function init(api) {
 
        initWebhookReceiversListeners(api);

}