const fetchPolyfill = require('node-fetch')
global.fetch = fetchPolyfill.fetch
global.Request = fetchPolyfill.Request
global.Headers = fetchPolyfill.Headers
global.Response = fetchPolyfill.Response