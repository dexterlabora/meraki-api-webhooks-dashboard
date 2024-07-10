import API from './apiHandlers.js';

function initWebhookReceiversListeners() {
    const document = window.document;
    const api = new API(localStorage.getItem('MerakiApiKey'));

    loadWebhookReceivers(api);

    const addOrgReceiverBtn = document.getElementById('addOrgReceiverBtn');
    const addNetReceiverBtn = document.getElementById('addNetReceiverBtn');
    const modal = document.getElementById('receiverModal');
    const closeModal = document.querySelector('.close-receiver-modal');
    const form = document.getElementById('receiverForm');
    const networkSelector = document.querySelector('.toolbar select');

    // Open modal for adding new receiver
    addOrgReceiverBtn.addEventListener('click', () => {
        form.reset(); // Reset form for new entry
        modal.style.display = 'block';
        form.setAttribute('data-scope', 'organization'); // Set data attribute to identify the scope
    });

    addNetReceiverBtn.addEventListener('click', () => {
        form.reset(); // Reset form for new entry
        modal.style.display = 'block';
        form.setAttribute('data-scope', 'network'); // Set data attribute to identify the scope
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const scope = form.getAttribute('data-scope'); // Get the scope from the data attribute
        const newReceiverData = {
            name: document.getElementById('name').value,
            url: document.getElementById('url').value,
            sharedSecret: document.getElementById('sharedSecret').value,
            payloadTemplate: {
                name: document.getElementById('payloadTemplate').value
            }
        };

        if (scope === 'organization') {
            api.createOrganizationWebhooksHttpServer(localStorage.getItem('MerakiOrganizationId'), newReceiverData)
                .then(() => {
                    loadWebhookReceivers(api);
                    modal.style.display = 'none';
                })
                .catch(error => console.error('Error adding organization receiver:', error));
        } else if (scope === 'network') {
            const selectedNetwork = networkSelector.value;
            api.createNetworkWebhooksHttpServer(selectedNetwork, newReceiverData)
                .then(() => {
                    loadWebhookReceiversForNetwork(api, selectedNetwork);
                    modal.style.display = 'none';
                })
                .catch(error => console.error('Error adding network receiver:', error));
        }
    });

    // Populate Network Selector Dropdown
    const networks = JSON.parse(localStorage.getItem('networks'));
    if (networks) {
        networks.forEach(network => {
            const option = document.createElement('option');
            option.value = network.id; // Set the value to the network ID or any unique identifier
            option.textContent = network.name; // Display the network name
            networkSelector.appendChild(option);
        });

        // Set the default selected network (first network in the list)
        const defaultNetworkId = networks[0].id;
        networkSelector.value = defaultNetworkId;

        // Load webhook receivers for the default selected network
        loadWebhookReceiversForNetwork(api, defaultNetworkId);
    }

    // Network Selector Change Event
    networkSelector.addEventListener('change', function() {
        const selectedNetwork = networkSelector.value;
        loadWebhookReceiversForNetwork(api, selectedNetwork);
    });
}

// Function to load webhook data
function loadWebhookReceivers(api) {
    console.log("loadWebhookReceivers");
    const document = window.document;
    const organizationId = localStorage.getItem('MerakiOrganizationId');
    api.getOrganizationWebhooksHttpServers(organizationId)
        .then(webhooksData => {
            const table = document.getElementById('OrgWebhookReceiversTable');
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

function loadWebhookReceiversForNetwork(api,networkId) {
    // Logic to load webhook receivers for the selected network
    console.log(`Loading webhook receivers for Network ID: ${networkId}`);

    const document = window.document;

    api.getNetworkWebhooksHttpServers(networkId)
        .then(webhooksData => {
            const table = document.getElementById('NetWebhookReceiversTable');
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