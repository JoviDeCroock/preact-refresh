/* globals __prefresh_utils__ */
module.exports = function() {
	const isPrefreshComponent = __prefresh_utils__.shouldBind(module);

	if (module.hot && isPrefreshComponent) {
		const previousHotModuleExports =
			module.hot.data && module.hot.data.moduleExports;

		if (previousHotModuleExports) {
			try {
				__prefresh_utils__.flush();
			} catch (e) {
				// Only available in newer webpack versions.
				if (module.hot.invalidate) {
					module.hot.invalidate();
				} else {
					self.location.reload();
				}
			}
		}

		module.hot.dispose(function(data) {
			data.moduleExports = __prefresh_utils__.getExports(module);
		});

		module.hot.accept(function errorRecovery() {
			require.cache[module.id].hot.accept(errorRecovery);
		});
	}
};
