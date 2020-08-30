const fs = require('fs-extra');
const path = require('path');
const execa = require('execa');
const puppeteer = require('puppeteer');

jest.setTimeout(100000);

const timeout = n => new Promise(r => setTimeout(r, n));

const binPath = path.resolve(
	__dirname,
	'../../../node_modules/vite/bin/vite.js'
);
const fixtureDir = path.join(__dirname, '../test/fixture');
const tempDir = path.join(__dirname, '../temp');
let devServer;
let browser;
let page;

const getEl = async selectorOrEl => {
	return typeof selectorOrEl === 'string'
		? await page.$(selectorOrEl)
		: selectorOrEl;
};

const getText = async selectorOrEl => {
	const el = await getEl(selectorOrEl);
	return el ? el.evaluate(el => el.textContent) : null;
};

async function updateFile(file, replacer) {
	const compPath = path.join(tempDir, file);
	const content = await fs.readFile(compPath, 'utf-8');
	await fs.writeFile(compPath, replacer(content));
}

beforeAll(async () => {
	try {
		await fs.remove(tempDir);
	} catch (e) {}

	await fs.copy(fixtureDir, tempDir, {
		filter: file => !/dist|node_modules/.test(file)
	});

	await execa('yarn', { cwd: tempDir });
});

describe('vite', () => {
	let serverLogs = [];
	let browserLogs = [];

	beforeAll(async () => {
		browser = await puppeteer.launch({
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
		page = await browser.newPage();

		console.log('starting dev server...');

		devServer = execa(binPath, {
			cwd: tempDir
		});

		devServer.stderr.on('data', data => {
			console.log('[SERVER LOG]: ', data.toString());
			serverLogs.push(data.toString());
		});

		await new Promise(resolve => {
			devServer.stdout.on('data', data => {
				serverLogs.push(data.toString());
				if (data.toString().match('running')) {
					console.log('dev server running.');
					resolve();
				}
			});
		});

		page = await browser.newPage();
		page.on('console', msg => {
			console.log('[BROWSER LOG]: ', msg);
			browserLogs.push(msg.text());
		});
		await page.goto('http://localhost:3000');
	});

	afterAll(async () => {
		try {
			await fs.remove(tempDir);
		} catch (e) {}
		if (browser) await browser.close();
		if (devServer) {
			devServer.kill('SIGTERM', {
				forceKillAfterTimeout: 2000
			});
		}
	});

	test('basic component', async () => {
		const button = await page.$('.button');
		expect(await getText(button)).toMatch('Increment');

		await updateFile('src/app.jsx', content =>
			content.replace('Increment', 'Increment (+)')
		);

		await timeout(500);
		expect(await getText(button)).toMatch('Increment (+)');
	});

	test('custom hook', async () => {
		const value = await page.$('.value');
		const button = await page.$('.button');
		expect(await getText(value)).toMatch('Count: 0');

		await button.evaluate(x => x.click());

		expect(await getText(value)).toMatch('Count: 1');

		await updateFile('src/useCounter.js', content =>
			content.replace('state + 1', 'state + 2')
		);

		await timeout(500);
		await button.evaluate(x => x.click());
		expect(await getText(value)).toMatch('Count: 3');
	});

	test('resets hook state', async () => {
		const value = await page.$('.value');
		expect(await getText(value)).toMatch('Count: 3');

		await updateFile('src/useCounter.js', content =>
			content.replace('useState(0);', 'useState(10);')
		);

		await timeout(500);
		expect(await getText(value)).toMatch('Count: 10');
	});
});
