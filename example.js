'use strict';

const Hapi = require('hapi');
const HapiBunny = require('.');
const server = new Hapi.Server();

server.connection({port: 3050});

server.route({
	method: 'GET',
	path: '/',
	handler: function (request, reply) {
		// request.log is HAPI standard way of logging
		request.log(['a', 'b'], 'Request into hello world');

		// you can also use a bunyan instance
		request.logger.info('In handler %s', request.path);

		return reply('hello!');
	}
});

server.register(HapiBunny, (err) => {
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
