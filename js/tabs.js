// PACKAGE LOADING

const { remote, ipcRenderer, nativeImage } = require('electron');

// INITIALIZE LOCAL SCRIPTS:

const web = require('./web'); // Used for managing webpage loading and websites
const storage = require('./store'); // Manages bookmark and history storage

const { BrowserView, BrowserWindow, ipcMain, Menu } = remote;
const { join } = require('path'); // Helps create full paths to local files

const win = remote.getCurrentWindow(); // Grabs the Peacock window

const topbarHeight = 70; // How high the Peacock topbar is, used in BrowserView scaling

let Sortable = require('sortablejs'); // Library for draggable/sortable elements
var sortable = new Sortable(document.getElementById('tabs')); // Make the tabs draggable/sortable

exports.tabs = []; // Array of all open tabs

var closedTabs = []; // Array of previously closed tabs, used in the Reopen Closed Tab shortcut

var activeTab; // Currently selected tab

var downloadWindow; // Stores the downloads window globall

// Initialize the downloads window:
exports.initDownloads = async () => {
	downloadWindow = new BrowserWindow({
		frame: false,
		width: window.outerWidth,
		height: 66,
		x: 0,
		y: window.outerHeight - 66,
		parent: remote.getCurrentWindow(),
		show: false,
		hasShadow: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});

	downloadWindow.loadURL(require('url').format({
		pathname: join(__dirname, '../static/pages/dialogs/download.html'),
		protocol: 'file:',
		slashes: true
	}));

	//downloadWindow.openDevTools({ mode: "detach" });

	ipcMain.on('startDrag', async (e, file) => {
		file = file.replace(/\\/g, "/");
		let image = nativeImage.createFromDataURL(`data:null`);

		console.log(file);

		downloadWindow.webContents.startDrag({ file: file, icon: image });
	});
}

// Decide whether file should be viewer (pdf) or downloaded:
exports.handleDownload = async (event, item) => {
	let itemAddress = item.getURL();
	if(item.getMimeType() === 'application/pdf' && itemAddress.indexOf('blob:') !== 0 && itemAddress.indexOf('#pdfjs.action=download') === -1) {
		event.preventDefault();
		let query = '?file=' + encodeURIComponent(itemAddress);
		this.current().webContents.loadURL(join(__dirname, '..', 'static', 'pdf', 'index.html') + query);
	} else {
		var savePath;

		downloadWindow.show();

		let id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
		downloadWindow.webContents.send('newDownload', id, item.getFilename(), itemAddress);

		item.on('updated', (event, state) => {
			if (state === 'interrupted') {
				downloadWindow.webContents.send('stoppedDownload', id, state);
			} else if (state === 'progressing') {
				savePath = item.savePath;
				if (item.isPaused()) {
					downloadWindow.webContents.send('stoppedDownload', id, 'paused');
				} else {
					let percentage = ~~((item.getReceivedBytes() / item.getTotalBytes()) * 100);
					downloadWindow.webContents.send('updateDownload', id, percentage);
				}
			}
		});

		ipcMain.once('cancel-download-' + id, () => { item.cancel(); console.log('CANCELLED:', id); });

		item.once('done', (event, state) => {
			if (state === 'completed') {
				console.log(savePath);
				downloadWindow.webContents.send('completeDownload', id, savePath);
			} else {
				downloadWindow.webContents.send('failedDownload', id);
			}
		});
	}
}

// Opens a recently closed tab:
exports.openClosedTab = function () {
	if(closedTabs.length == 0) return;
	let item = closedTabs[closedTabs.length-1];
	this.newView(item);

	const index = closedTabs.indexOf(item);
	if (index > -1) closedTabs.splice(index, 1);
}

// Returns the current tab:
exports.current = function () {
	return activeTab;
}

// Initializes a view with bindings from web.js:
exports.initBrowserView = async (view) => {
	view.webContents.on('did-start-loading', async () => { web.loadStart(view) });
	view.webContents.on('did-stop-loading', async () => { web.loadStop(view) });
	view.webContents.on('did-fail-load', async (e, ec, ed, vu) => {web.failLoad(e, view, ec, ed, vu); });
	view.webContents.on('enter-html-full-screen', async () => { web.enterFllscrn(view, remote.screen) });
	view.webContents.on('leave-html-full-screen', async () => { web.leaveFllscrn(view, win.getBounds().height) });
	view.webContents.on('dom-ready', async () => { web.domReady(view, storage) });
	view.webContents.on('new-window', async (e, url, f, disposition) => {
		switch (disposition) {
			case 'background-tab':
				this.newView(url, false);
				break;
			default:
				this.newView(url);
				break;
		}
	});
	// view.webContents.on('page-favicon-updated', async (e) => { web.faviconUpdated(view, e.favicons) });
	view.webContents.on('page-title-updated', async (e, t) => { web.titleUpdated(view, e, t) });
	view.webContents.on('did-navigate', async (e, url) => { web.didNavigate(url, view, storage) });
	view.webContents.on('did-navigate-in-page', async (e, url) => { web.didNavigate(url, view, storage) });
	view.webContents.on('preload-error', async (e, path, err) => { console.error("PRELOAD ERROR", err); });
	view.webContents.session.on('will-download', this.handleDownload);
	view.webContents.on('certificate-error', async (e, url, err, cert, callback) => {
		e.preventDefault();
		callback(true);
		console.log('certificate-error', err);
	});
}

// Saves an HTML page:
exports.savePage = function(contents) {
	let filters = [
		{ name: 'Webpage, Complete', extensions: ['htm', 'html'] },
		{ name: 'Webpage, HTML Only', extensions: ['html', 'htm'] },
		{ name: 'Webpage, Single File', extensions: ['mhtml'] }
	];

	let options = {
		title: 'Save as...',
		filters: filters
	};

	dialog.showSaveDialog(options).then((det) => {
		if(!det.cancelled){
			let path = det.filePath;
			let saveType;
			if(path.endsWith('htm')) saveType = 'HTMLComplete';
			if(path.endsWith('html')) saveType = 'HTMLOnly';
			if(path.endsWith('mhtml')) saveType = 'MHTML';

			contents.savePage(path, saveType).then(() => {
				console.log('Page was saved successfully.') }).catch(err => { console.error(err) });
		}
	});
}

// Activate (select) a certain tab:
exports.activate = function (view) {
	let win = remote.getCurrentWindow();
	let views = win.getBrowserViews();
	for (let i = 0; i < views.length; i++) {
		if(views[i].type == 'tab') win.removeBrowserView(views[i]);
	}
	win.addBrowserView(view);
	document.getElementById('url').value = '';

	this.viewActivated(view);

	if(document.getElementsByClassName('selected')[0]) {
		document.getElementsByClassName('selected')[0].classList.remove('selected');
	}

	view.tab.element.classList.add('selected');
	activeTab = view;
}

// Close a tab:
exports.close = async (view) => {
	view = view || this.current();

	if(activeTab == view) {
		let id = this.tabs.indexOf(view);
		let length = this.tabs.length;

		if (length == 1) { remote.app.quit(); return; }

		let nextTab = (id != 0) ? this.tabs[id - 1] : this.tabs[id + 1];
		this.activate(nextTab);
	}

	view.tab.element.remove();
	
	closedTabs.push(view.webContents.getURL());
	
	this.viewClosed(view);
	view.destroy();
}

// Create a new tab:
exports.newView = function (url='peacock://newtab', active=true) {
	// USER AGENT RANDOMIZATION

	let version = Math.floor(Math.random() * (69 - 53) + 53); // Grab a random number from 68 to 53 inclusive
	// Use the number above as your 'Firefox version' user agent:
	var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:' + version + '.0) Gecko/20100101 Firefox/' + version + '.0';

	// BROWSERVIEW CREATION

	let view = new BrowserView({
		webPreferences: {
			preload: join(__dirname, 'preload.js')
		}
	});
	let tabSession = view.webContents.session;

	view.webContents.setUserAgent(userAgent);

	// WEBRTC IP HANDLING POLICY

	view.webContents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');

	// BOUNDS

	// Synchronize view size with parent window size:
	view.setBounds({x:0, y:topbarHeight, width:win.getContentBounds().width, height:win.getContentBounds().height - topbarHeight });

	win.on('resize', () => {
		view.setBounds({x:0, y:topbarHeight, width:win.getContentBounds().width, height:win.getContentBounds().height - topbarHeight });
	});

	// HEADER CONFIGURATION

	tabSession.webRequest.onBeforeSendHeaders(async (det, callback) => {
		if(det.url.substr(0,5) == 'http:' && store.get('flags').includes('--https-only')) { // If request is HTTP and https-only mode is enabled
			callback({ cancel: true }); // Cancel the request
			if(det.resourceType == 'mainFrame') view.webContents.loadURL('https' + det.url.substr(4)); // Redirect website requests to HTTPS
		} else if('Content-Type' in det.requestHeaders && store.get('flags').includes('--no-pings')) { // If pings are disabled
			if(det.requestHeaders['Content-Type'][0] == 'text/ping') callback({ cancel: true }); // If this request is a ping, cancel it
		} else {
			let headers = det.requestHeaders;
			if(store.get('flags').includes('--no-referrers')) headers['Referer'] = ''; // Omit 'Referer' header when 'no-referrers' flag is enabled
			if(store.get('flags').includes('--do-not-track')) headers['DNT'] = '1'; // Enable DNT for 'do-not-track' flag
			headers['Accept-Language'] = 'en-US,en;q=0.9'; // Normalize the 'Accept-Language' header to prevent browser fingerprinting
			headers['User-Agent'] = userAgent; // Randomize the user agent to throw websites off your tracks
			callback({ cancel: false, requestHeaders: headers }); // Don't cancel the request but use these modified headers instead
		}
	});

	// tabSession.protocol.interceptFileProtocol('chrome-extension', async (req, cb) => {
	//   if(!req.url.includes('mhjfbmdgcfjbbpaeojofohoefgiehjai')) return;
	//   let relative = req.url.replace('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/', '');
	//   cb(join(__dirname, '..', 'static', 'pdf', relative));
	// });

	// DUCKDUCKGO SMARTER ENCRYPTION

	// tabSession.protocol.interceptHttpProtocol('http', (req, cb) => {
	//   let url = new URL(req.url);
	//   let shasum = crypto.createHash('sha1');
	//   let hash = shasum.update(url.host).digest('hex');
	//   $.get('https://duckduckgo.com/smarter_encryption.js?pv1=' + hash.substr(0,4), data => {
	//     console.log(data.includes(hash), url.host);
	//   });
	//   cb();
	// });

	// THIRD-PARTY COOKIE BLOCKING

	tabSession.cookies.on('changed', async (e, cookie, cause, rem) => {
		if(!rem) {
			let split = cookie.domain.split('.');
			let domain = split[split.length - 2] + '.' + split[split.length - 1];
			try {
				split = (new URL(view.webContents.getURL())).host.split('.');
				let host = split[split.length - 2] + '.' + split[split.length - 1];
				if(domain != host) {
					tabSession.cookies.remove(view.webContents.getURL(), cookie.name);
				}
			} catch (error) {
				console.log('### COOKIE OOF')
			}
		}
	});

	// CUSTOM PROTOCOLS

	tabSession.protocol.registerHttpProtocol('ipfs', (req, cb) => {
		var hash = req.url.substr(7);
		cb({ url: 'https://ipfs.io/ipfs/' + hash });
	}, () => {});

	// PDF & JSON READER

	tabSession.webRequest.onResponseStarted(async (det) => {
		let type = det.responseHeaders['Content-Type'] || det.responseHeaders['content-type'];
		let resource = det.resourceType;

		if(!resource || !type) return;
		let query = '?url=' + encodeURIComponent(det.url);
		
		if(resource == 'mainFrame' && type[0].includes('application/json') && store.get('settings.json_viewer')) {
			view.webContents.loadURL('file://' + join(__dirname, '..', 'static', 'json-viewer', 'index.html') + query);
		} // else if (resource == 'mainFrame' && type[0].includes('application/pdf') && store.get('settings.pdf_viewer')) {
		// 	view.webContents.loadURL(join(__dirname, '..', 'static', 'pdf', 'index.html') + query);
		// }
	});

	// tabSession.protocol.registerFileProtocol('pdf', (req, cb) => {
	//   var url = req.url.substr(6);
	//   let result = join(__dirname, '../static/pdf/', url);
	//   console.log(result);
	//   cb(result); // + '' + url
	// }, (error) => {});

	tabSession.protocol.registerFileProtocol('assets', (req, cb) => {
		var url = req.url.replace(new URL(req.url).protocol, '');

		if(url.includes('..')) {
			cb(join(__dirname, '../css/favicon.png'));
		} else {
			cb(join(__dirname, '../css/', url));
		}
	}, () => {});

	tabSession.protocol.registerFileProtocol('peacock', (req, cb) => {
		var url = new URL(req.url);
		if(url.hostname == 'network-error') {
			cb(join(__dirname, '../static/pages/', `network-error.html`));
		} else {
			url = req.url.replace(url.protocol, '');
			cb(join(__dirname, '../static/pages/', `${ url }.html`));
		}
	}, () => { });

	tabSession.protocol.registerFileProtocol('browser', (req, cb) => {
		var url = new URL(req.url);
		if(url.hostname == 'network-error') {
			cb(join(__dirname, '../static/pages/', `network-error.html`));
		} else {
			url = req.url.replace(url.protocol, '');
			cb(join(__dirname, '../static/pages/', `${ url }.html`));
		}
	}, () => {});

	tabSession.protocol.registerFileProtocol('about', (req, cb) => {
		var url = new URL(req.url);
		if(url.hostname == 'network-error') {
			cb(join(__dirname, '../static/pages/', `network-error.html`));
		} else {
			url = req.url.replace(url.protocol, '');
			cb(join(__dirname, '../static/pages/', `${ url }.html`));
		}
	}, () => {});

	// CLOSE HANDLING

	ipcMain.on('closeCurrentTab', async (e, id) => {
		if(id == view.webContents.id) this.close(view);
	});

	// CONTEXT (RIGHT-CLICK) MENU

	require('electron-context-menu')({
		window: view.webContents,
		prepend: (defaultActions, params) => [
			{
				label: 'Back',
				accelerator: 'Alt+Left',
				visible: params.selectionText.length == 0,
				enabled: view.webContents.canGoBack(),
				click: async () => { view.webContents.goBack(); }
			},
			{
				label: 'Forward',
				accelerator: 'Alt+Right',
				visible: params.selectionText.length == 0,
				enabled: view.webContents.canGoForward(),
				click: async () => { view.webContents.goForward(); }
			},
			{
				label: 'Reload',
				accelerator: 'CmdOrCtrl+R',
				visible: params.selectionText.length == 0,
				click: async () => { view.webContents.reload(); }
			},
			{
				type: 'separator'
			},
			{
				label: 'Save as...',
				accelerator: 'CmdOrCtrl+S',
				visible: params.selectionText.length == 0,
				click: async () => { this.savePage(view.webContents); }
			},
			{
				type: 'separator'
			},
			{
				label: 'View Image',
				visible: params.mediaType === 'image',
				click: async () => { view.webContents.loadURL(params.srcURL); }
			},
			{
				label: 'Open Link in New Tab',
				visible: params.linkURL.length > 0,
				click: async () => { this.newView(params.linkURL); }
			}
		],
		showLookUpSelection: true,
		showCopyImageAddress: true,
		showSaveImageAs: true,
		showInspectElement: true
	});

	var tabEl = document.createElement('div');
	tabEl.classList.add('tab');
	tabEl.innerHTML = `<img class="tab-icon" src="//:0">
		<p class="tab-label">Loading...</p>
		<img class="tab-close" src="images/close.svg">`.trim();

	document.getElementById('new-tab').insertAdjacentElement('beforebegin', tabEl);

	view.tab = {
		element: document.getElementById('new-tab').previousElementSibling,
		setIcon: async (icon) => {
			view.tab.icon.addEventListener("error", () => { view.tab.icon.src = '//:0' });
			view.tab.icon.src = icon;
		},
		setTitle: async (title) => { view.tab.title.innerText = title; },
		close: async () => { view.tab.element.remove(); }
	};

	view.tab.element.style.opacity = '1';
	view.tab.element.style.width = '250px';

	view.tab.icon = view.tab.element.children[0];
	view.tab.title = view.tab.element.children[1];
	view.tab.button = view.tab.element.children[2];

	// TAB MENU

	let tabMenuTemp = [
		{ label:'Reload', click: async() => view.webContents.reload() },
		{ label:'Duplicate', click: async() => this.newView(view.webContents.getURL()) },
		{ label:'Pin', click: async() => alert('Tab pinning hasn\'t been added yet.') },
		{ type: 'separator' },
		{ label:'Close', click: async() => this.close(view) }
	];

	view.tab.element.addEventListener('mousedown', async (e) => {
		switch (e.which) {
			case 1:
				this.activate(view);
				break;
			case 2:
				this.close(view);
				break;
			case 3:
				Menu.buildFromTemplate(tabMenuTemp).popup();
				break;
			default:
				break;
		}
	});

	view.tab.button.addEventListener('click', async (e) => {
		e.stopPropagation();
		this.close(view);
	});

	view.type = 'tab';

	view.webContents.loadURL(url);
	this.initBrowserView(view);

	this.viewAdded(view);

	if(active) { this.activate(view); this.activate(view); }

	return view;
}

// Navigate to the next tab relative to the active one:
exports.nextTab = async () => {
	let length = this.tabs.length;
	let index = this.tabs.indexOf(activeTab);

	if (length == 1) return;

	if (index == length - 1) { this.activate(this.tabs[0]); }
	else { this.activate(this.tabs[index + 1]); }
}

// Navigate to the previous tab relative to the active one:
exports.backTab = async () => {
	let length = this.tabs.length;
	let index = this.tabs.indexOf(activeTab);

	if (length == 1) return;

	if (index == 0) { this.activate(this.tabs[length - 1]); }
	else { this.activate(this.tabs[index - 1]); }
}

exports.viewActivated = function (view) { web.changeTab(view, storage); }
exports.viewAdded = function (view) { this.tabs.push(view); ipcRenderer.send('viewAdded'); }
exports.viewClosed = function (view, tabs=this.tabs) {
	const index = tabs.indexOf(view);
	if (index > -1) tabs.splice(index, 1);
}

exports.showDialog = async (text) => {
	let { BrowserView } = remote;
	let view = new BrowserView();
	view.webContents.loadURL('data:,' + encodeURIComponent(text));
	remote.getCurrentWindow().addBrowserView(view);
}

document.getElementById('new-tab').addEventListener('click', async () => this.newView('browser://newtab'));

// this.initDownloads();
