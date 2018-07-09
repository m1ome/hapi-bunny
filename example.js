'use strict';

const Hapi = require('hapi');
const HapiBunny = require('.');

const server = Hapi.server({port: 3050});

server.route({
	method: 'GET',
	path: '/',
	handler: (request, h) => {
		// `request.log` is Hapi standard way of logging
		request.log(['a', 'b'], 'Request into hello world');

		// You can also use a bunyan instance
		request.logger.info('In handler %s', request.path);

		return h.response('hello!');
	}
});

async function startup() {
	await server.register(HapiBunny);

	// The logger is available in server.app
	server.app.logger.warn('Bunyan is registered');

	// Also as a decorated API
	server.logger().info('another way for accessing it');

	// And through Hapi standard logging system
	server.log(['subsystem'], 'one more way for accessing it');

	await server.start();
}

startup();
