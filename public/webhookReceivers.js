/**
 * Webhook Receivers Management Module
 * 
 * This module handles the functionality for managing webhook receivers in the Meraki Dashboard application.
 * It provides features for displaying, adding, and managing webhook receivers at both organization and network levels.
 * 
 * Key features:
 * - Initializes event listeners for UI interactions
 * - Loads and displays existing webhook receivers for organizations and networks
 * - Handles adding new webhook receivers
 * - Manages the modal for adding/editing webhook receivers
 * - Populates network selector dropdown
 * - Fetches and displays payload templates
 * 
 * Main functions:
 * - initWebhookReceiversListeners: Sets up event listeners and initializes the module
 * - loadWebhookReceivers: Fetches and displays organization-level webhook receivers
 * - loadWebhookReceiversForNetwork: Fetches and displays network-level webhook receivers
 * - populatePayloadTemplates: Fetches and populates payload template options
 * 
 * This module interacts with the API handler (imported from './apiHandlers.js')
 * to perform API-related operations. It also manipulates the DOM to update
 * the user interface based on the current state of webhook receivers.
 * 
 * Note: Ensure that the API handler is properly configured and the DOM elements
 * referenced in this module exist in the corresponding HTML file.
 */

import API from './apiHandlers.js';

export function initWebhookReceivers() {
    const document = window.document;
    const api = new API(localStorage.getItem('MerakiApiKey'));

    loadWebhookReceivers(api);

    const addOrgReceiverBtn = document.getElementById('addOrgReceiverBtn');
    const addNetReceiverBtn = document.getElementById('addNetReceiverBtn');
    const modal = document.getElementById('receiverModal');
    const closeModal = document.querySelector('.close-receiver-modal');
    const form = document.getElementById('receiverForm');
    const networkSelector = document.getElementById('networkSelector');

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
                    loadWebhookReceivers();
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
    const networks = JSON.parse(localStorage.getItem('networks') || '[]');
    if (Array.isArray(networks)) {
        networks.forEach(network => {
            const option = document.createElement('option');
            option.value = network.id; // Set the value to the network ID or any unique identifier
            option.textContent = network.name; // Display the network name
            networkSelector.appendChild(option);
        });

        // Set the default selected network (first network in the list)
        if (networks.length > 0) {
            const defaultNetworkId = networks[0].id;
            networkSelector.value = defaultNetworkId;

            // Load webhook receivers for the default selected network
            loadWebhookReceiversForNetwork(api, defaultNetworkId);
        }
    } else {
        console.error('Networks data is not an array:', networks);
    }

    // Network Selector Change Event
    networkSelector.addEventListener('change', function() {
        const selectedNetwork = networkSelector.value;
        loadWebhookReceiversForNetwork(api, selectedNetwork);
    });

    // Call the function to populate payload templates on page load
    populatePayloadTemplates(api);
}

// Function to populate the payload template options
function populatePayloadTemplates(api) {
    const payloadTemplateSelect = document.getElementById('payloadTemplate');
    const organizationId = localStorage.getItem('MerakiOrganizationId');

    api.getOrganizationWebhooksPayloadTemplates(organizationId)
        .then(res => {
            console.log("populatePayloadTemplates res.data",res.data);
            try {
                let payloadTemplates = res.data; 
                payloadTemplates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id; // Set the value to the template ID or any unique identifier
                    option.textContent = template.name; // Display the template name
                    payloadTemplateSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error parsing payload templates:', error);
            }
        })
        .catch(error => console.error('Error fetching payload templates:', error));
}

// Function to load webhook data
function loadWebhookReceivers(api) {
    const document = window.document;
    const organizationId = localStorage.getItem('MerakiOrganizationId');
    api.getOrganizationWebhooksHttpServers(organizationId)
        .then(res => {
            let webhooksData = res.data;
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

function loadWebhookReceiversForNetwork(api, networkId) {
    const document = window.document;
    api.getNetworkWebhooksHttpServers(networkId)
        .then(res => {
            let webhooksData = res.data;
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