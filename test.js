'use strict';
const crypto = require('crypto');

const expect = require('chai').expect;
const Hapi = require('hapi');
const HapiBunyan = require('.');

function Catcher() {
	this.records = [];
}

Catcher.prototype.write = function (record) {
	this.records.push(record);
};

Catcher.prototype.flush = function () {
	this.records = [];
};

Catcher.prototype.pop = function () {
	return this.records.pop();
};

function randomString() {
	const rndString = crypto.randomBytes(32).toString();

	return crypto.createHash('md5').update(rndString).digest('hex').toString();
}

function createServer() {
	const server = new Hapi.Server();
	server.connection({ port: 3000 });
	return server;
}

function registerWithBunny(server, options, callback) {
	server.register({
		register: HapiBunyan.register,
		options: options
	}, callback);
}

describe('Register testing', () => {
	it('should register successfully', () => {
		const server = createServer();
		registerWithBunny(server, null, (err) => {
			expect(server.logger()).to.not.be.undefined;
		});
	});
});

describe('Logging though server.logger()', () => {
	const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
	const catcher = new Catcher();
	const options = {
		streams: [
			{
				type: 'raw',
				stream: catcher,
				level: 'trace'
			}
		]
	};

	for (let i = 0; i < logLevels.length; i++) {
		it('should send "' + logLevels[i] + '" level', () => {
			const level = logLevels[i];
			const server = createServer();

			registerWithBunny(server, options, (err) => {
				const rndMessage = randomString();
				expect(server.logger()).to.not.be.undefined;
				server.logger()[level](rndMessage);

				const msg = catcher.pop();
				expect(msg).to.be.not.undefined;
				expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v']);
				expect(msg.msg).to.be.equal(rndMessage)
			});
		});
	}
});


describe('Logging through server.app.logger', () => {
	const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
	const catcher = new Catcher();
	const options = {
		streams: [
			{
				type: 'raw',
				stream: catcher,
				level: 'trace'
			}
		]
	};

	for (let i = 0; i < logLevels.length; i++) {
		it('should send "' + logLevels[i] + '" level', () => {
			const level = logLevels[i];
			const server = createServer();

			registerWithBunny(server, options, (err) => {
				const rndMessage = randomString();
				expect(server.logger()).to.not.be.undefined;
				server.app.logger[level](rndMessage);

				const msg = catcher.pop();
				expect(msg).to.be.not.undefined;
				expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v']);
				expect(msg.msg).to.be.equal(rndMessage)
			});
		});
	}
});

describe('Logging through server.log()', () => {
	const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
	const catcher = new Catcher();
	const options = {
		streams: [
			{
				type: 'raw',
				stream: catcher,
				level: 'trace'
			}
		]
	};

	describe('Should convert basic logs into bunyan one', () => {
		for (let i = 0; i < logLevels.length; i++) {
			it('should send "' + logLevels[i] + '" level', () => {
				const level = logLevels[i];
				const server = createServer();

				registerWithBunny(server, options, (err) => {
					const rndMessage = randomString();
					expect(server.logger()).to.not.be.undefined;
					server.log([level], rndMessage);

					const msg = catcher.pop();
					expect(msg).to.be.not.undefined;
					expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v']);
					expect(msg.msg).to.be.contain(rndMessage);
					expect(msg.msg).to.be.contain(level);
				});
			});
		}
	});

	describe('Should send all other logs to "info" level', () => {
		const catcher = new Catcher();
		const options = {
			streams: [
				{
					type: 'raw',
					stream: catcher,
					level: 'trace'
				}
			]
		};

		it('should send some unknown level to "info" level', () => {
			const server = createServer();

			registerWithBunny(server, options, (err) => {
				const rndMessage = randomString();
				expect(server.logger()).to.not.be.undefined;
				server.log(['some_strange_level'], rndMessage);

				const msg = catcher.pop();
				expect(msg).to.be.not.undefined;
				expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v']);
				expect(msg.msg).to.be.contain(rndMessage);
				expect(msg.msg).to.be.contain('some_strange_level');
			});
		});
	});
});

describe("Hapi request logging", () => {
	it("it should handle request logging though request.logger", () => {
		const rndMessage = randomString();
		const catcher = new Catcher();
		const server = createServer();

		const options = {
			streams: [
				{
					type: 'raw',
					stream: catcher,
					level: 'trace'
				}
			]
		};

		server.route({
			path: '/',
			method: 'GET',
			handler: (request, reply) => {
				request.logger.info(rndMessage);
				return reply('hello world');
			}
		});

		registerWithBunny(server, options, (err) => {
			server.inject('/', (res) => {
				const records = res.request.logger.streams[0].stream.records;
				expect(records.length).to.be.equal(2);
				expect(records[0]).to.have.any.keys(['msg', 'request']);
				expect(records[1]).to.have.any.keys(['response', 'responseTime', 'request']);
			});
		});
	});

	it("should track request error", () => {
		const rndMessage = randomString();
		const catcher = new Catcher();
		const server = createServer();

		const options = {
			streams: [
				{
					type: 'raw',
					stream: catcher,
					level: 'trace'
				}
			]
		};

		server.route({
			path: '/',
			method: 'GET',
			handler: (request, reply) => {
				return reply(new Error('Boom!'));
			}
		});

		registerWithBunny(server, options, (err) => {
			server.inject('/', (res) => {
				const records = res.request.logger.streams[0].stream.records;
				expect(records.length).to.be.equal(2);
				expect(records[0]).to.have.any.keys(['error', 'response']);
				expect(records[1]).to.have.any.keys(['response', 'responseTime', 'request']);
			});
		});
	});
});