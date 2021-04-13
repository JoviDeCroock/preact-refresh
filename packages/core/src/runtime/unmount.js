import { options } from 'preact';
import { internalsByNodeType } from './internalsByNodeType';

const oldUnmount = options.unmount;
options.unmount = internal => {
  const type = (internal || {}).type;
  if (typeof type === 'function' && internalsByNodeType.has(type)) {
    const internals = internalsByNodeType.get(type);
    if (internals) {
      const index = internals.indexOf(internal);
      if (index !== -1) {
        internals.splice(index, 1);
      }
    }
  }

  if (oldUnmount) oldUnmount(internal);
};
