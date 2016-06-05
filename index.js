'use strict';

const bunyan = require('bunyan');

function register(server, options, next) {
	options.name = options.name || 'hapi';

	const logger = bunyan.createLogger(options);
	const bunyanLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

	server.app.logger = logger;
	server.decorate('server', 'logger', () => logger);

	server.ext('onRequest', (request, reply) => {
		request.logger = logger.child({request: request.id});
		reply.continue();
	});

	server.on('log', (event) => {
		logEvent(logger, event);
	});

	server.on('request', (request, event) => {
		logEvent(request.logger, event);
	});

	server.on('request-error', (request, event) => {
		request.logger.warn({
			response: {
				statusCode: request.raw.res.statusCode,
				headers: request.raw.res._headers,
				output: request.raw.res.output
			},
			error: event
		}, 'request error');
	});

	server.on('response', (request) => {
		const inf = request.info;

		request.logger.info({
			response: {
				statusCode: request.raw.res.statusCode,
				headers: request.raw.res._headers,
				output: request.raw.res.output
			},
			responseTime: inf.responded - inf.received
		}, 'request complete');
	});

	function logEvent(curLogger, event) {
		const tags = event.tags;
		const data = event.data;

		for (var i = 0; i < tags.length; i++) {
			if (bunyanLevels.indexOf(tags[i]) !== -1) {
				curLogger[tags[i]](tags, data);
			}
		}

		curLogger.info(tags, data);
	}

	return next();
}

module.exports.register = register;
module.exports.register.attributes = {
	pkg: require('./package')
};
