


function initWebhookReceiversListeners() {
    const document = window.document;
  
    
    loadWebhookReceivers();

    // const addReceiver = document.getElementById('#addReceiver');
    // console.log('addReceiver', addReceiver);
    // document.getElementById('#addReceiver').addEventListener('click', function () {
    //     // Logic to add a new webhook receiver
    //     console.log('Add new webhook receiver');
    // });
}

// Function to load webhook data
function loadWebhookReceivers() {
    const document = window.document;
    console.log("webhookReceivers.js - loadWebhookReceivers");
    // Fetch or use static data here
    const webhooksData = [
        { name: 'Google Sheets', url: 'https://script.google.com/...', secret: '****', template: 'Default' },
        // Add more data
    ];

   // const tbody = document.querySelector('.webhooks-table tbody');
   const table = document.getElementById('webhookReceiversTable');
   console.log("webhookReceivers.js - loadWebhookReceivers - table  ", table);
   const tbody = table.querySelector('tbody');
    console.log("webhookReceivers.js - loadWebhookReceivers - tbody", tbody);
    tbody.innerHTML = ''; // Clear existing rows
    webhooksData.forEach(webhook => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td>${webhook.name}</td>
                <td>${webhook.url}</td>
                <td>${webhook.secret}</td>
                <td>${webhook.template}</td>
                <td><button>Options</button></td>
            `;
        tbody.appendChild(tr);
    });
}

export function init() {
    window.document.addEventListener('DOMContentLoaded', function() {
        
        initWebhookReceiversListeners();
    });
    
    //initWebhookReceiversListeners();
  //  loadWebhookReceivers();
}


