const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path')

require('dotenv').config();
app.use(express.json());


function getStaticPath() {
    if (process.pkg) {
        // '__dirname' gives the path to the snapshot filesystem in the executable
        return path.join(path.dirname(process.execPath), '../public');
    } else {
        return path.join(__dirname, 'public');
    }
}

app.use(express.static(getStaticPath()));

  
const mockMode = process.env.MOCK_MODE === 'true';

// Generic proxy function for Meraki API requests
async function proxyMerakiApiRequest(req, res, apiPath) {
    const apiKey = req.headers.authorization;
    
    if (!apiKey) {
        return res.status(401).send({ error: 'No API key provided' });
    }

    const url = `https://api.meraki.com/api/v1${apiPath}`;

    try {
        console.log("proxy", url)
        console.log("apiKey", apiKey)
        const response = await fetch(url, {
            headers: {
                'Authorization': `${apiKey}`,
                'User-Agent':'MerakiAPIMonitorMock CoryCreations'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("response", url, response.status)
    // console.log("response data", data)
        res.send(data);
    } catch (error) {
        console.error('Error making API request to Meraki:', error);
        res.status(500).send({ error: 'Error fetching data from Meraki API' });
    }
}

// Dynamic routing to handle various API requests
app.get('/api/*', (req, res) => {
    if (mockMode) {
        const mockFile = req.url.replace('/api/', '') + '.json';
        res.sendFile(`${__dirname}/mockData/${mockFile}`);
    } else {
        const apiPath = req.url.replace('/api', '');
        proxyMerakiApiRequest(req, res, apiPath);
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    if (process.send) {
        process.send('ready');
      }
});
