import { options } from 'preact';
import { internalsByNodeType } from './vnodesForComponent';

// const getMappedVnode = type => {
//   if (mappedVNodes.has(type)) {
//     return getMappedVnode(mappedVNodes.get(type));
//   }

//   return type;
// };

const INTERNAL_OPTION = '__i';

const oldInternal = options[INTERNAL_OPTION];
options[INTERNAL_OPTION] = (internal, vnode) => {
  if (vnode && typeof vnode.type === 'function') {
    const internals = internalsByNodeType.get(vnode.type);
    if (!vnodes) {
      internalsByNodeType.set(vnode.type, [internal]);
    } else {
      internals.push(internal);
    }

    // TODO: will this still be needed? https://github.com/JoviDeCroock/prefresh/pull/236
    // const foundType = getMappedVnode(vnode.type);
    // vnode.type = foundType;
    // if (vnode[VNODE_COMPONENT]) {
    //   vnode[VNODE_COMPONENT].constructor = foundType;
    // }
  }

  if (oldInternal) oldInternal(internal, vnode);
};
