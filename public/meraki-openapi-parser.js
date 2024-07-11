// const axios = require('axios');
console.log("running meraki-openapi-parser")
async function fetchAndParseOpenAPISpec() {
  const specUrl = 'https://raw.githubusercontent.com/meraki/openapi/v1-beta/openapi/spec3.json';
  
  try {
    const response = await axios.get(specUrl);
    const spec = response.data;
    
    const operationsInfo = [];
    
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (operation.operationId) {
          operationsInfo.push({
            operationId: operation.operationId,
            description: operation.description || '',
            deprecated: operation.deprecated || false,
            tags: operation.tags || []
          });
        }
      }
    }
    
    return operationsInfo;
  } catch (error) {
    console.error('Error fetching or parsing OpenAPI spec:', error);
    return [];
  }
}

export default fetchAndParseOpenAPISpec