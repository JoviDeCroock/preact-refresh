const RuntimeGlobals = require('webpack/lib/RuntimeGlobals');
const RuntimeModule = require('webpack/lib/RuntimeModule');
const Template = require('webpack/lib/Template');

const NAMESPACE = '__PREFRESH__';

const beforeModule = `
self.$RefreshSig$ = () => {
  let status = 'begin';
  let savedType;
  return (type, key, forceReset, getCustomHooks) => {
    if (!savedType) savedType = type;
    status = self.${NAMESPACE}.sign(type || savedType, key, forceReset, getCustomHooks, status);
    return type;
  };
};
`;

class PrefreshRuntimeModule extends RuntimeModule {
  constructor() {
    super('prefresh', 5);
  }

  generate() {
    const { runtimeTemplate } = this.compilation;
    return Template.asString([
      `${
        RuntimeGlobals.interceptModuleExecution
      }.push(${runtimeTemplate.basicFunction('options', [
        `${
          runtimeTemplate.supportsConst() ? 'const' : 'var'
        } originalFactory = options.factory;`,
        `options.factory = ${runtimeTemplate.basicFunction(
          'moduleObject, moduleExports, webpackRequire',
          [
            'const prevRefreshReg = self.$RefreshReg$;',
            'const prevRefreshSig = self.$RefreshSig$;',
            beforeModule,
            `const reg = ${runtimeTemplate.basicFunction('currentModuleId', [
              'self.$RefreshReg$ = (type, id) => {',
              `self.${NAMESPACE}.register(type, currentModuleId + ' ' + id);`,
              '};',
            ])}`,
            'reg()',
            'try {',
            Template.indent(
              'originalFactory.call(this, moduleObject, moduleExports, webpackRequire);'
            ),
            '} finally {',
            Template.indent('self.$RefreshReg$ = prevRefreshReg;'),
            Template.indent('self.$RefreshSig$ = prevRefreshSig;'),
            '}',
          ]
        )}`,
      ])})`,
      '',
    ]);
  }
}

module.exports = PrefreshRuntimeModule;
