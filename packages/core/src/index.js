// Options for Preact.
import './runtime/catchError';
import './runtime/debounceRendering';
import './runtime/vnode';
import './runtime/unmount';

import { Component } from 'preact';

import {
  VNODE_COMPONENT,
  NAMESPACE,
  HOOKS_LIST,
  EFFECTS_LIST,
  COMPONENT_HOOKS,
  VNODE_DOM,
  VNODE_CHILDREN,
  HOOK_ARGS,
  HOOK_VALUE,
  HOOK_CLEANUP,
} from './constants';
import { computeKey } from './computeKey';
import { internalsByNodeType } from './runtime/vnodesForComponent';
import { signaturesForType } from './runtime/signaturesForType';

let typesById = new Map();
let pendingUpdates = [];

function sign(type, key, forceReset, getCustomHooks, status) {
  if (type) {
    let signature = signaturesForType.get(type);
    if (status === 'begin') {
      signaturesForType.set(type, {
        type,
        key,
        forceReset,
        getCustomHooks: getCustomHooks || (() => []),
      });

      return 'needsHooks';
    } else if (status === 'needsHooks') {
      signature.fullKey = computeKey(signature);
    }
  }
}

function replaceComponent(OldType, NewType, resetHookState) {
  const internals = internalsByNodeType.get(OldType);
  if (!internals) return;

  // migrate the list to our new constructor reference
  internalsByNodeType.delete(OldType);
  internalsByNodeType.set(NewType, internals);

  // mappedVNodes.set(OldType, NewType);

  pendingUpdates = pendingUpdates.filter(p => p[0] !== OldType);

  internals.forEach(internal => {
    // update the type in-place to reference the new component
    internal.type = NewType;
    internal._vnodeId++;

    if (internal[VNODE_COMPONENT]) {
      internal[VNODE_COMPONENT].constructor = internal.type;

      try {
        if (internal[VNODE_COMPONENT] instanceof OldType) {
          const oldInst = internal[VNODE_COMPONENT];

          const newInst = new NewType(
            internal[VNODE_COMPONENT].props,
            internal[VNODE_COMPONENT].context
          );

          internal[VNODE_COMPONENT] = newInst;
          // copy old properties onto the new instance.
          //   - Objects (including refs) in the new instance are updated with their old values
          //   - Missing or null properties are restored to their old values
          //   - Updated Functions are not reverted
          //   - Scalars are copied
          for (let i in oldInst) {
            const type = typeof oldInst[i];
            if (!(i in newInst)) {
              newInst[i] = oldInst[i];
            } else if (type !== 'function' && typeof newInst[i] === type) {
              if (
                type === 'object' &&
                newInst[i] != null &&
                newInst[i].constructor === oldInst[i].constructor
              ) {
                Object.assign(newInst[i], oldInst[i]);
              } else {
                newInst[i] = oldInst[i];
              }
            }
          }
        }
      } catch (e) {
        /* Functional component */
        internal[VNODE_COMPONENT].constructor = NewType;
      }

      if (resetHookState) {
        if (
          internal[VNODE_COMPONENT][COMPONENT_HOOKS] &&
          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST] &&
          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST].length
        ) {
          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST].forEach(
            possibleEffect => {
              if (
                possibleEffect[HOOK_CLEANUP] &&
                typeof possibleEffect[HOOK_CLEANUP] === 'function'
              ) {
                possibleEffect[HOOK_CLEANUP]();
              } else if (
                possibleEffect[HOOK_ARGS] &&
                possibleEffect[HOOK_VALUE] &&
                Object.keys(possibleEffect).length === 3
              ) {
                const cleanupKey = Object.keys(possibleEffect).find(
                  key => key !== HOOK_ARGS && key !== HOOK_VALUE
                );
                if (
                  cleanupKey &&
                  typeof possibleEffect[cleanupKey] == 'function'
                )
                  possibleEffect[cleanupKey]();
              }
            }
          );
        }

        internal[VNODE_COMPONENT][COMPONENT_HOOKS] = {
          [HOOKS_LIST]: [],
          [EFFECTS_LIST]: [],
        };
      } else {
        if (
          internal[VNODE_COMPONENT][COMPONENT_HOOKS] &&
          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST] &&
          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST].length
        ) {
          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST].forEach(
            possibleEffect => {
              if (
                possibleEffect[HOOK_CLEANUP] &&
                typeof possibleEffect[HOOK_CLEANUP] === 'function'
              ) {
                possibleEffect[HOOK_CLEANUP]();
              } else if (
                possibleEffect[HOOK_ARGS] &&
                possibleEffect[HOOK_VALUE] &&
                Object.keys(possibleEffect).length === 3
              ) {
                const cleanupKey = Object.keys(possibleEffect).find(
                  key => key !== HOOK_ARGS && key !== HOOK_VALUE
                );
                if (
                  cleanupKey &&
                  typeof possibleEffect[cleanupKey] == 'function'
                )
                  possibleEffect[cleanupKey]();
              }
            }
          );

          internal[VNODE_COMPONENT][COMPONENT_HOOKS][HOOKS_LIST].forEach(
            hook => {
              if (hook.__H && Array.isArray(hook.__H)) {
                hook.__H = undefined;
              }
            }
          );
        }
      }

      // Cleanup when an async component has thrown.
      if (
        (internal[VNODE_DOM] && !document.contains(internal[VNODE_DOM])) ||
        (!internal[VNODE_DOM] && !internal[VNODE_CHILDREN])
      ) {
        location.reload();
      }

      Component.prototype.forceUpdate.call(internal[VNODE_COMPONENT]);
    }
  });
}

self[NAMESPACE] = {
  getSignature: type => signaturesForType.get(type),
  register: (type, id) => {
    if (typeof type !== 'function') return;

    if (typesById.has(id)) {
      const existing = typesById.get(id);
      if (existing !== type) {
        pendingUpdates.push([existing, type]);
        typesById.set(id, type);
      }
    } else {
      typesById.set(id, type);
    }

    if (!signaturesForType.has(type)) {
      signaturesForType.set(type, {
        getCustomHooks: () => [],
        type,
      });
    }
  },
  getPendingUpdates: () => pendingUpdates,
  flush: () => {
    pendingUpdates = [];
  },
  replaceComponent,
  sign,
  computeKey,
};
