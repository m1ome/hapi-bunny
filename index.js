'use strict';

const bunyan = require('bunyan');

function register(server, options, next) {
	options.name = options.name || 'hapi';

	const logger = bunyan.createLogger(options);
	const bunyanLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

	server.app.logger = logger;
	server.decorate('server', 'logger', () => logger);

	server.on('log', (event) => {
		sendLog(logger, event);
	});

	function sendLog(curLogger, event) {
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
