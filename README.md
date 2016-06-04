# Hapi-Bunny

[![Build Status](https://travis-ci.org/m1ome/hapi-bunny.svg?branch=master)](https://travis-ci.org/m1ome/hapi-bunny)
[![Coverage Status](https://coveralls.io/repos/github/m1ome/hapi-bunny/badge.svg?branch=master)](https://coveralls.io/github/m1ome/hapi-bunny?branch=master)
[![Dependency Status](https://david-dm.org/m1ome/hapi-bunny.svg)](https://david-dm.org/m1ome/hapi-bunny)

[Hapi](http://hapijs.com/) plugin for the [Bunyan](https://github.com/trentm/node-bunyan) logger. 
It logs in JSON for easy post-processing.

# Installation

```
npm install --save hapi-bunny
``` 

# Usage

```javascript
'use strict'

const Hapi = require('hapi')

const server = new Hapi.Server()
server.connection({port: 3000});

// Add the route
'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();

server.route({
	method: 'GET',
	path: '/',
	handler: function (request, reply) {
		// request.log is HAPI standard way of logging
		request.log(['a', 'b'], 'Request into hello world');

		// you can also use a bunyan instance
		request.logger.info('In handler %s', request.path);

		return reply();
	}
});

server.register(require('hapi-bunny'), (err) => {
	if (err) {
		throw err;
	}

	// the logger is available in server.app
	server.app.logger.warn('Bunyan is registered');

	// also as a decorated API
	server.logger().info('another way for accessing it');

	// and through Hapi standard logging system
	server.log(['subsystem'], 'one more way for accessing it');

	server.start((err) => {
		if (err) {
			throw err;
		}
	});
});
```

# License 
MIT