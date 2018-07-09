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

async function registerWithBunny(server, options) {
	return server.register({
		plugin: HapiBunyan,
		options: options
	});
}

describe('Register testing', () => {
	it('should register successfully', async () => {
		const server = Hapi.server({ port: 3000 });
		await registerWithBunny(server, null);
		expect(server.logger()).to.not.be.undefined;
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
		it('should send "' + logLevels[i] + '" level', async () => {
			const level = logLevels[i];
			const server = Hapi.server({ port: 3000 });

			await registerWithBunny(server, options);
			const rndMessage = randomString();
			expect(server.logger()).to.not.be.undefined;
			server.logger()[level](rndMessage);

			const msg = catcher.pop();
			expect(msg).to.be.not.undefined;
			expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v']);
			expect(msg.msg).to.be.equal(rndMessage)
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
		it('should send "' + logLevels[i] + '" level', async () => {
			const level = logLevels[i];
			const server = Hapi.server({ port: 3000 });

			await registerWithBunny(server, options);
			const rndMessage = randomString();
			expect(server.logger()).to.not.be.undefined;
			server.app.logger[level](rndMessage);

			const msg = catcher.pop();
			expect(msg).to.be.not.undefined;
			expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'time', 'v']);
			expect(msg.msg).to.be.equal(rndMessage)
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
			it('should send "' + logLevels[i] + '" level', async () => {
				const level = logLevels[i];
				const server = Hapi.server({ port: 3000 });

				registerWithBunny(server, options);
				const rndMessage = randomString();
				expect(server.logger()).to.not.be.undefined;
				server.log([level], rndMessage);

				const msg = catcher.pop();
				expect(msg).to.be.not.undefined;
				expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'tags', 'time', 'v']);
				expect(msg.msg).to.be.contain(rndMessage);
				expect(msg.tags).to.be.contain(level);
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

		it('should send some unknown level to "info" level', async () => {
			const server = Hapi.server({ port: 3000 });

			registerWithBunny(server, options);
			const rndMessage = randomString();
			expect(server.logger()).to.not.be.undefined;
			server.log(['some_strange_level'], rndMessage);

			const msg = catcher.pop();
			expect(msg).to.be.not.undefined;
			expect(msg).to.have.all.keys(['name', 'hostname', 'pid', 'level', 'msg', 'tags', 'time', 'v']);
			expect(msg.msg).to.be.contain(rndMessage);
			expect(msg.tags).to.be.contain('some_strange_level');
		});
	});
});

describe("Hapi request logging", () => {
	it("it should handle request logging though request.logger", async () => {
		const rndMessage = randomString();
		const catcher = new Catcher();
		const server = Hapi.server({ port: 3000 });

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
			handler: (request, h) => {
				request.log(['a', 'b'], rndMessage);
				request.logger.info(rndMessage);
				return h.response('hello world');
			}
		});

		registerWithBunny(server, options);
		server.inject('/', (res) => {
			const records = res.request.logger.streams[0].stream.records;
			expect(records.length).to.be.equal(3);
			expect(records[0]).to.have.any.keys(['msg', 'request']);
			expect(records[1]).to.have.any.keys(['response', 'responseTime', 'request']);
		});
	});

	it("should track request error", async () => {
		const rndMessage = randomString();
		const catcher = new Catcher();
		const server = Hapi.server({ port: 3000 });

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
			handler: (request, h) => {
				throw new Error('Boom!');
			}
		});

		registerWithBunny(server, options);
		server.inject('/', (res) => {
			const records = res.request.logger.streams[0].stream.records;
			expect(records.length).to.be.equal(2);
			expect(records[0]).to.have.any.keys(['error', 'response']);
			expect(records[1]).to.have.any.keys(['response', 'responseTime', 'request']);
		});
	});
});
