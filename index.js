'use strict';

const bunyan = require('bunyan');

function register(server, options) {
	options.name = options.name || 'hapi';

	const logger = bunyan.createLogger(options);
	const bunyanLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

	server.app.logger = logger;
	server.decorate('server', 'logger', () => logger);

	server.ext('onRequest', (request, h) => {
		request.logger = logger.child({request: request.id});
		return h.continue;
	});

	server.events.on('log', event => {
		logEvent(logger, event);
	});

	server.events.on('request', (request, event) => {
		logEvent(request.logger, event);
	});

	server.events.on({name: 'request', channels: 'error'}, (request, event) => {
		request.logger.warn({
			response: {
				statusCode: request.raw.res.statusCode,
				headers: request.raw.res._headers,
				output: request.raw.res.output
			},
			error: event
		}, 'request error');
	});

	server.events.on('response', request => {
		const inf = request.info;

		request.logger.info({
			request: {
				ip: inf.remoteAddress,
				referer: inf.referrer,
				path: request.response.request.path,
				headers: request.response.request.headers
			},
			response: {
				statusCode: request.response.statusCode
			},
			responseTime: inf.responded - inf.received
		}, 'Request');
	});

	function logEvent(curLogger, event) {
		const {tags, data} = event;

		// Check if tags contain a valid log level, first match wins (default: 'info')
		const level = tags.filter(tag => bunyanLevels.indexOf(tag) !== -1)[0] || 'info';
		curLogger[level]({tags}, data);
	}
}

exports.plugin = {
	pkg: require('./package'),
	register
};
