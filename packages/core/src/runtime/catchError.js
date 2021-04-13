import { options } from 'preact';
import {
  CATCH_ERROR_OPTION,
  COMPONENT_DIRTY,
  VNODE_COMPONENT,
} from '../constants';

const oldCatchError = options[CATCH_ERROR_OPTION];
options[CATCH_ERROR_OPTION] = (error, vnode) => {
  // TODO: work with bitflag for this.
  if (vnode[VNODE_COMPONENT] && vnode[VNODE_COMPONENT][COMPONENT_DIRTY]) {
    vnode[VNODE_COMPONENT][COMPONENT_DIRTY] = false;
  }

  if (oldCatchError) oldCatchError(error, vnode);
};
