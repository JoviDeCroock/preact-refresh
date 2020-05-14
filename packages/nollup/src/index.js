const NAMESPACE = '__PREFRESH__';

module.exports = function() {
	return {
		nollupModuleWrap(code) {
			return `
                const prevRefreshReg = window.$RefreshReg$;
                const prevRefreshSig = window.$RefreshSig$;

                window.$RefreshSig$ = () => {
                    let status = 'begin';
                    let savedType;
                    return (type, key, forceReset, getCustomHooks) => {
                        if (!savedType) savedType = type;
                        status = self.${NAMESPACE}.sign(type || savedType, key, forceReset, getCustomHooks, status);
                    };
                };

                window.$RefreshReg$ = (type, id) => {
                    self.${NAMESPACE}.register(type, module.id + ' ' + id);
                };

                try {
                    ${code}
                } finally {
                    window.$RefreshReg$ = prevRefreshReg;
                    window.$RefreshSig$ = prevRefreshSig;
                }
            `;
		},

		transform(code, id) {
			if (this.getModuleInfo(id).isEntry) {
				return {
					code: 'import "@prefresh/core";' + code
				};
			}

			if (id.includes('prefresh') || id.includes('node_modules')) {
				return;
			}

			return {
				code: [
					code,
					'import { __$RefreshCheck$__ } from "@prefresh/nollup/src/runtime"',
					'__$RefreshCheck$__(module)'
				].join(';')
			};
		}
	};
};
