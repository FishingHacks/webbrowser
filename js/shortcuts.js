const { Menu } = require('electron').remote;

var keyboardShortcut, switchTab;

exports.init = function (keyboardShortcutB, switchTabB) {
	keyboardShortcut = keyboardShortcutB;
	switchTab = switchTabB;
}

const menuTemplate = [
	{
		label: 'Window',
		submenu: [
			{
				label: 'Open DevTools',
				accelerator: 'CmdOrCtrl+Alt+J',
				click: async () => {
					keyboardShortcut('browserDevTools');
				}
			},
			{
				label: 'Restart Browser',
				accelerator: 'CmdOrCtrl+Alt+R',
				click: async () => {
					keyboardShortcut('restart');
				}
			},
			{
				label: 'Focus Searchbar',
				accelerator: 'CmdOrCtrl+E',
				click: async () => {
					keyboardShortcut('focusSearchbar');
				}
			},
			{
				label: 'Focus Searchbar',
				accelerator: 'CmdOrCtrl+L',
				click: async () => {
					keyboardShortcut('focusSearchbar');
				}
			},
			{
				label: 'Open History',
				accelerator: 'CmdOrCtrl+H',
				click: async () => keyboardShortcut('openHistory')
			},
			{
				label: 'Open Bookmarks',
				accelerator: 'CmdOrCtrl+Shift+B',
				click: async () => keyboardShortcut('openBookmarks')
			},
			{
				label: 'Open Settings',
				accelerator: 'CmdOrCtrl+Shift+S',
				click: async () => keyboardShortcut('openSettings')
			}
		]
	},
	{
		label: 'Website',
		submenu: [
			{
				label: 'Open DevTools',
				accelerator: 'CmdOrCtrl+Shift+J',
				click: async () => {
					keyboardShortcut('devTools');
				}
			},
			{
				label: 'Zoom In',
				accelerator: 'CmdOrCtrl+=',
				click: async () => {
					keyboardShortcut('zoomIn');
				}
			},
			{
				label: 'Zoom Out',
				accelerator: 'CmdOrCtrl+-',
				click: async () => {
					keyboardShortcut('zoomOut');
				}
			},
			{
				label: 'Reset Zoom',
				accelerator: 'CmdOrCtrl+0',
				click: async () => {
					keyboardShortcut('resetZoom');
				}
			},
			{
				label: 'Back',
				accelerator: 'Alt+Left',
				click: async () => {
					keyboardShortcut('backPage');
				}
			},
			{
				label: 'Forward',
				accelerator: 'Alt+Right',
				click: async () => {
					keyboardShortcut('forwardPage');
				}
			},
			{
				label: 'Reload Page',
				accelerator: 'F5',
				click: async () => {
					keyboardShortcut('refreshPage');
				}
			},
			{
				label: 'Reload Page',
				accelerator: 'CmdOrCtrl+R',
				click: async () => {
					keyboardShortcut('refreshPage');
				}
			},
			{
				label: 'Force Reload Page',
				accelerator: 'CmdOrCtrl+F5',
				click: async () => {
					keyboardShortcut('forceReload');
				}
			},
			{
				label: 'Save as...',
				accelerator: 'CmdOrCtrl+S',
				click: async () => {
					keyboardShortcut('savePage');
				}
			},
			{
				label: 'Scroll To Top',
				accelerator: 'CmdOrCtrl+Up',
				click: async () => {
					keyboardShortcut('scrollToTop');
				}
			}
		]
	},
	{
		label: 'Tabs',
		submenu: [
			{
				label: 'Next Tab',
				accelerator: 'CmdOrCtrl+Tab',
				click: async () => {
					keyboardShortcut('nextTab');
				}
			},
			{
				label: 'Previous Tab',
				accelerator: 'CmdOrCtrl+Shift+Tab',
				click: async () => {
					keyboardShortcut('backTab');
				}
			},
			{
				label: 'New Tab',
				accelerator: 'CmdOrCtrl+T',
				click: async () => {
					keyboardShortcut('newTab');
				}
			},
			{
				label: 'Close Tab',
				accelerator: 'CmdOrCtrl+W',
				click: async () => {
					keyboardShortcut('closeTab');
				}
			},
			{
				label: 'Open Closed Tab',
				accelerator: 'CmdOrCtrl+Shift+T',
				click: async () => {
					keyboardShortcut('openClosedTab');
				}
			},
			{
				label: 'Quick Switch',
				submenu: [
					{ label: 'Nagiate to Tab 1', accelerator: 'CmdOrCtrl+1', click: async () => switchTab(1) },
					{ label: 'Nagiate to Tab 2', accelerator: 'CmdOrCtrl+2', click: async () => switchTab(2) },
					{ label: 'Nagiate to Tab 3', accelerator: 'CmdOrCtrl+3', click: async () => switchTab(3) },
					{ label: 'Nagiate to Tab 4', accelerator: 'CmdOrCtrl+4', click: async () => switchTab(4) },
					{ label: 'Nagiate to Tab 5', accelerator: 'CmdOrCtrl+5', click: async () => switchTab(5) },
					{ label: 'Nagiate to Tab 6', accelerator: 'CmdOrCtrl+6', click: async () => switchTab(6) },
					{ label: 'Nagiate to Tab 7', accelerator: 'CmdOrCtrl+7', click: async () => switchTab(7) },
					{ label: 'Nagiate to Tab 8', accelerator: 'CmdOrCtrl+8', click: async () => switchTab(8) },
					{ label: 'Nagiate to Tab 9', accelerator: 'CmdOrCtrl+9', click: async () => switchTab(9) }
				]
			}
		]
	}
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
